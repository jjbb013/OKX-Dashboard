import asyncio
import json
import websockets
from fastapi import FastAPI, WebSocket, Body
from fastapi.middleware.cors import CORSMiddleware
import threading
import os
from dotenv import load_dotenv
import random
import string
import time
from datetime import datetime, timezone, timedelta
from okx.Trade import TradeAPI
from okx.Account import AccountAPI
from pydantic import BaseModel
from typing import List, Dict, Any

# 加载.env
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')

# 读取多账户API信息
OKX_ACCOUNTS = []
idx = 1
while True:
    api_key = os.getenv(f"OKX_API_KEY_{idx}")
    api_secret = os.getenv(f"OKX_API_SECRET_{idx}")
    passphrase = os.getenv(f"OKX_API_PASSPHRASE_{idx}")
    if not api_key:
        break
    OKX_ACCOUNTS.append({
        "apiKey": api_key,
        "apiSecret": api_secret,
        "passphrase": passphrase,
        "flag": os.getenv(f"OKX_FLAG_{idx}", "0"),
        "name": os.getenv(f"OKX_ACCOUNT_NAME_{idx}", f"账户{idx}")
    })
    idx += 1

# 读取账户备注名
ACCOUNT_NAMES = [acc['name'] for acc in OKX_ACCOUNTS]

@app.get("/api/account_names")
def get_account_names():
    return {"account_names": ACCOUNT_NAMES}

@app.get("/api/config")
def get_config():
    if not os.path.exists(CONFIG_FILE):
        return {"batchOrderInstIds": []}
    with open(CONFIG_FILE, 'r') as f:
        return json.load(f)

@app.post("/api/config")
async def set_config(config: Dict[str, Any] = Body(...)):
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)
    return {"status": "success"}

latest_data = {}  # {account_idx: [data]}
ws_clients = set()
latest_prices = {}  # {instId: markPx}

# 合约面值
CONTRACT_FACE_VALUE = {
    'DOGE-USDT-SWAP': 1,
    'ETH-USDT-SWAP': 0.01,
    'BTC-USDT-SWAP': 0.01,
}

def get_contract_face_value(instId):
    return CONTRACT_FACE_VALUE.get(instId, 1)

def get_beijing_time():
    beijing_tz = timezone(timedelta(hours=8))
    return datetime.now(beijing_tz).strftime("%Y-%m-%d %H:%M:%S")

def generate_clord_id():
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    random_str = ''.join(random.choices(string.ascii_letters + string.digits, k=6))
    return f"GEMINI{timestamp}{random_str}"[:32]

class OrderRequest(BaseModel):
    account_indices: list[int]
    inst_id: str
    order_size: str
    order_side: str

class ClosePositionRequest(BaseModel):
    account_indices: list[int]
    pos_data: dict

class EmergencyCloseRequest(BaseModel):
    account_indices: list[int]
    inst_ids: list[str]

class LeverageRequest(BaseModel):
    account_index: int
    inst_id: str
    mgn_mode: str

@app.post("/api/place_order")
async def place_order(req: OrderRequest):
    results = []
    for account_idx in req.account_indices:
        if account_idx >= len(OKX_ACCOUNTS):
            results.append({
                "account_name": f"Invalid Index {account_idx}",
                "success": False,
                "error": "Invalid account index"
            })
            continue
        
        account = OKX_ACCOUNTS[account_idx]
        trade_api = TradeAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])
        
        order_params = {
            "instId": req.inst_id,
            "tdMode": "cross",
            "side": req.order_side,
            "ordType": "market",
            "sz": req.order_size,
            "clOrdId": generate_clord_id(),
            "posSide": "long" if req.order_side == "buy" else "short"
        }
        
        print(f"[{get_beijing_time()}] [ORDER] Placing order for {account['name']}: {json.dumps(order_params)}")
        # 下单接口修正
        result = trade_api.place_order(**order_params)
        print(f"[{get_beijing_time()}] [ORDER] Result for {account['name']}: {json.dumps(result)}")
        results.append({"account_name": account['name'], "result": result})
        
    return {"results": results}

@app.post("/api/close_position")
async def close_position(req: ClosePositionRequest):
    results = []
    for account_idx in req.account_indices:
        if account_idx >= len(OKX_ACCOUNTS):
            results.append({
                "account_name": f"Invalid Index {account_idx}",
                "success": False,
                "error": "Invalid account index"
            })
            continue

        account = OKX_ACCOUNTS[account_idx]
        trade_api = TradeAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])
        
        pos = req.pos_data
        close_side = "sell" if pos['posSide'] == 'long' else 'buy'
        
        order_params = {
            "instId": pos['instId'],
            "tdMode": "cross",
            "side": close_side,
            "ordType": "market",
            "sz": pos['pos'],
            "clOrdId": generate_clord_id(),
            "posSide": pos['posSide']
        }
        
        print(f"[{get_beijing_time()}] [CLOSE] Closing position for {account['name']}: {json.dumps(order_params)}")
        result = trade_api.place_order(**order_params)
        print(f"[{get_beijing_time()}] [CLOSE] Result for {account['name']}: {json.dumps(result)}")
        results.append({"account_name": account['name'], "result": result})

    return {"results": results}

@app.post("/api/emergency_close")
async def emergency_close(req: EmergencyCloseRequest):
    results = []
    for account_idx in req.account_indices:
        if account_idx >= len(OKX_ACCOUNTS):
            results.append({
                "account_name": f"Invalid Index {account_idx}",
                "success": False,
                "error": "Invalid account index"
            })
            continue

        account = OKX_ACCOUNTS[account_idx]
        account_name = account.get("name", f"账户{account_idx+1}")
        account_api = AccountAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])
        trade_api = TradeAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])

        for inst_id in req.inst_ids:
            try:
                # Get positions
                positions_result = account_api.get_positions(instId=inst_id)
                if positions_result.get('code') != '0' or not positions_result.get('data'):
                    print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] No position found for {inst_id} or API error: {positions_result.get('msg')}")
                    continue

                positions = [pos for pos in positions_result['data'] if float(pos.get('pos', '0') or '0') != 0]
                if not positions:
                    print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] No active position for {inst_id}.")
                    continue

                for pos in positions:
                    pos_side = pos.get('posSide', '')
                    pos_size = pos.get('pos', '0')
                    side = 'sell' if pos_side == 'long' else 'buy'

                    close_params = {
                        "instId": inst_id,
                        "tdMode": "cross",
                        "side": side,
                        "posSide": pos_side,
                        "ordType": "market",
                        "sz": pos_size
                    }
                    
                    print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] Attempting to close {inst_id} {pos_side} position of size {pos_size}")
                    result = trade_api.place_order(**close_params)
                    
                    if result.get('code') == '0':
                        print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] Successfully closed {inst_id} {pos_side} position.")
                        results.append({
                            "account_name": account_name,
                            "inst_id": inst_id,
                            "success": True,
                            "message": f"Successfully closed {pos_side} position."
                        })
                    else:
                        print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] Failed to close {inst_id} {pos_side} position: {result.get('msg')}")
                        results.append({
                            "account_name": account_name,
                            "inst_id": inst_id,
                            "success": False,
                            "error": f"Failed to close {pos_side} position: {result.get('msg')}"
                        })

            except Exception as e:
                error_message = f"An exception occurred while closing {inst_id}: {str(e)}"
                print(f"[{get_beijing_time()}] [EMERGENCY_CLOSE] [{account_name}] {error_message}")
                results.append({
                    "account_name": account_name,
                    "inst_id": inst_id,
                    "success": False,
                    "error": error_message
                })
    return {"results": results}

@app.post("/api/leverage")
async def get_leverage(req: LeverageRequest):
    if req.account_index >= len(OKX_ACCOUNTS):
        return {"success": False, "error": "Invalid account index"}
    
    account = OKX_ACCOUNTS[req.account_index]
    account_api = AccountAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])
    
    result = account_api.get_leverage(req.inst_id, req.mgn_mode)
    return result

async def okx_login(ws, apiKey, apiSecret, passphrase):
    import time, hmac, base64
    ts = str(int(time.time()))
    sign = base64.b64encode(
        hmac.new(
            apiSecret.encode(),
            f"{ts}GET/users/self/verify".encode(),
            digestmod="sha256"
        ).digest()
    ).decode()
    login_req = {
        "op": "login",
        "args": [{
            "apiKey": apiKey,
            "passphrase": passphrase,
            "timestamp": ts,
            "sign": sign
        }]
    }
    await ws.send(json.dumps(login_req))

async def okx_account_ws(account_idx, account):
    url = "wss://ws.okx.com:8443/ws/v5/private"
    while True:
        try:
            async with websockets.connect(url) as ws:
                await okx_login(ws, account["apiKey"], account["apiSecret"], account["passphrase"])
                
                # Wait for login success
                login_success = False
                while not login_success:
                    msg = await asyncio.wait_for(ws.recv(), timeout=10)
                    data = json.loads(msg)
                    if data.get("event") == "login" and data.get("code") == "0":
                        login_success = True
                
                # Subscribe to balance and position
                sub_req = {
                    "id": f"acc{account_idx}",
                    "op": "subscribe",
                    "args": [{"channel": "balance_and_position"}]
                }
                await ws.send(json.dumps(sub_req))
                
                # Receive pushes
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=60) # Add timeout to detect dead connections
                    data = json.loads(msg)
                    if data.get("arg", {}).get("channel") == "balance_and_position" and "data" in data:
                        for d in data["data"]:
                            for pos in d.get("posData", []):
                                instId = pos.get("instId")
                                avgPx = float(pos.get("avgPx", 0))
                                posQty = float(pos.get("pos", 0))
                                posSide = pos.get("posSide", "net")
                                markPx = float(latest_prices.get(instId, 0))
                                face_value = get_contract_face_value(instId)
                                
                                if avgPx > 0 and posQty != 0 and markPx > 0:
                                    pnl_multiplier = 1 if posSide == 'long' else -1
                                    unrealized = (markPx - avgPx) * posQty * face_value * pnl_multiplier
                                    unrealized_pct = (unrealized / (avgPx * posQty * face_value)) * 100 if (avgPx * posQty * face_value) != 0 else 0
                                else:
                                    unrealized = 0
                                    unrealized_pct = 0

                                # 获取杠杆信息
                                account_api = AccountAPI(account["apiKey"], account["apiSecret"], account["passphrase"], False, account["flag"])
                                leverage_result = account_api.get_leverage(instId=instId, mgnMode="cross")
                                if leverage_result and leverage_result.get("code") == "0" and leverage_result.get("data"):
                                    for lv_data in leverage_result["data"]:
                                        if lv_data.get("posSide") == posSide:
                                            pos["lever"] = lv_data.get("lever")
                                            break
                                
                                pos["unrealizedPnl"] = unrealized
                                pos["unrealizedPnlPct"] = unrealized_pct
                                pos["lastPrice"] = markPx
                                
                        latest_data[account_idx] = data["data"]
                        for client in ws_clients:
                            await client.send_json({"account": account_idx, "data": data["data"]})
        except (websockets.exceptions.ConnectionClosed, asyncio.TimeoutError) as e:
            print(f"[{get_beijing_time()}] [WS-{account['name']}] Connection lost ({e}), reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[{get_beijing_time()}] [WS-{account['name']}] Error: {e}")
            await asyncio.sleep(5)


async def okx_mark_price_ws():
    url = "wss://ws.okx.com:8443/ws/v5/public"
    while True:
        try:
            instIds = set(["DOGE-USDT-SWAP", "ETH-USDT-SWAP", "BTC-USDT-SWAP"])
            for acc_data in latest_data.values():
                for d in acc_data:
                    for pos in d.get("posData", []):
                        if pos.get("instId"):
                            instIds.add(pos.get("instId"))
            
            args = [{"channel": "mark-price", "instId": instId} for instId in instIds if instId]
            
            if not args:
                await asyncio.sleep(5)
                continue

            async with websockets.connect(url) as ws:
                sub_req = {"op": "subscribe", "args": args}
                await ws.send(json.dumps(sub_req))
                
                while True:
                    msg = await asyncio.wait_for(ws.recv(), timeout=60)
                    data = json.loads(msg)
                    if data.get("arg", {}).get("channel") == "mark-price" and "data" in data:
                        mark = data["data"][0]
                        instId = mark.get("instId")
                        markPx = float(mark.get("markPx", 0))
                        if instId:
                            latest_prices[instId] = markPx
                            # Broadcast mark price to all clients
                            for client in ws_clients:
                                await client.send_json({
                                    "type": "mark_price",
                                    "payload": {
                                        "instId": instId,
                                        "markPx": markPx
                                    }
                                })
        except (websockets.exceptions.ConnectionClosed, asyncio.TimeoutError, WebSocketDisconnect) as e:
            print(f"[{get_beijing_time()}] [MARK-PRICE-WS] Connection lost ({e}), reconnecting in 5s...")
            await asyncio.sleep(5)
        except Exception as e:
            print(f"[{get_beijing_time()}] [MARK-PRICE-WS] Error: {e}")
            await asyncio.sleep(5)


def start_okx_ws():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    tasks = [okx_account_ws(idx, acc) for idx, acc in enumerate(OKX_ACCOUNTS)]
    tasks.append(okx_mark_price_ws())
    loop.run_until_complete(asyncio.gather(*tasks))

@app.on_event("startup")
def start_ws_thread():
    threading.Thread(target=start_okx_ws, daemon=True).start()

from starlette.websockets import WebSocketDisconnect

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.add(websocket)
    try:
        # Send latest data for all accounts on first connect
        for idx, data in latest_data.items():
            await websocket.send_json({"account": idx, "data": data})
        
        # Send current latest prices to the newly connected client
        for instId, markPx in latest_prices.items():
            await websocket.send_json({
                "type": "mark_price",
                "payload": {
                    "instId": instId,
                    "markPx": markPx
                }
            })

        while True:
            # Keep connection alive
            await websocket.receive_text()
    except (WebSocketDisconnect, websockets.exceptions.ConnectionClosed):
        print(f"[{get_beijing_time()}] [WS] Client disconnected.")
    finally:
        ws_clients.discard(websocket)