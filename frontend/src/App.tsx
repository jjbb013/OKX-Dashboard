import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

interface Position {
    instId: string;
    posSide: 'long' | 'short' | 'net';
    pos: string;
    avgPx: string;
    mgnMode: string;
    lever?: string;
    lastPrice?: number;
    unrealizedPnl?: number;
    unrealizedPnlPct?: number;
}

interface BalanceData {
    ccy: string;
    cashBal: string;
    uTime: string;
}

const API_BASE_URL = 'http://127.0.0.1:8000';

const AccountCard: React.FC<{ name: string; balance: BalanceData[]; positions: Position[] }> = ({ name, balance, positions }) => (
    <div className="card" style={{ minWidth: 350, maxWidth: 500 }}>
        <h2>{name}</h2>
        <div style={{ marginBottom: 10 }}>
            <strong>余额：</strong>
            <ul style={{ margin: 0, paddingLeft: 20 }}>
                {balance.map((b, i) => (
                    <li key={i}>{b.ccy}: <span style={{ color: '#4caf50' }}>{b.cashBal}</span></li>
                ))}
            </ul>
        </div>
        <div>
            <strong>持仓：</strong>
            <table className="positions-table">
                <thead>
                    <tr>
                        <th>合约</th>
                        <th>方向</th>
                        <th>数量</th>
                        <th>杠杆</th>
                        <th>均价</th>
                        <th>最新价</th>
                        <th>未实现盈亏(%)</th>
                    </tr>
                </thead>
                <tbody>
                    {positions.length === 0 ? (
                        <tr><td colSpan={7} style={{ color: '#888', textAlign: 'center' }}>无持仓</td></tr>
                    ) : positions.map((pos, i) => (
                        <tr key={i}>
                            <td>{pos.instId}</td>
                            <td>{pos.posSide}</td>
                            <td>{pos.pos}</td>
                            <td>{pos.lever || 'N/A'}x</td>
                            <td>{pos.avgPx}</td>
                            <td>{pos.lastPrice?.toFixed(4) ?? '-'}</td>
                            <td style={{ color: (pos.unrealizedPnl || 0) > 0 ? '#26A69A' : '#EF5350' }}>
                                {pos.unrealizedPnl?.toFixed(2) ?? '-'} ({pos.unrealizedPnlPct?.toFixed(2) ?? '-'}%)
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

const AccountSelector: React.FC<{ accounts: string[]; selectedAccounts: number[]; onChange: (selection: number[]) => void }> = ({ accounts, selectedAccounts, onChange }) => (
    <div className="form-group">
        <label>账户选择</label>
        <div className="account-selector">
            {accounts.map((name, index) => (
                <label key={index} className="account-checkbox">
                    <input
                        type="checkbox"
                        checked={selectedAccounts.includes(index)}
                        onChange={() => {
                            const newSelection = selectedAccounts.includes(index)
                                ? selectedAccounts.filter(i => i !== index)
                                : [...selectedAccounts, index];
                            onChange(newSelection);
                        }}
                    />
                    {name}
                </label>
            ))}
        </div>
    </div>
);

const PlaceOrder: React.FC<{ selectedAccounts: number[] }> = ({ selectedAccounts }) => {
    const [instId, setInstId] = useState('ETH-USDT-SWAP');
    const [size, setSize] = useState('1');

    const handleOrder = (side: 'buy' | 'sell') => {
        if (selectedAccounts.length === 0) {
            alert('请至少选择一个账户');
            return;
        }
        fetch(`${API_BASE_URL}/api/place_order`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                account_indices: selectedAccounts,
                inst_id: instId,
                order_size: size,
                order_side: side
            }),
        })
            .then(res => res.json())
            .then(data => alert(`下单结果: ${JSON.stringify(data, null, 2)}`))
            .catch(err => alert(`下单异常: ${err.toString()}`));
    };

    return (
        <div className="card">
            <h2>批量下单</h2>
            <div className="form-group">
                <label>合约ID</label>
                <input className="input" value={instId} onChange={e => setInstId(e.target.value)} />
            </div>
            <div className="form-group">
                <label>下单数量</label>
                <input className="input" value={size} onChange={e => setSize(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
                <button className="button button-primary" onClick={() => handleOrder('buy')}>买入开多</button>
                <button className="button button-danger" onClick={() => handleOrder('sell')}>卖出开空</button>
            </div>
        </div>
    );
};

const EmergencyClose: React.FC<{ selectedAccounts: number[] }> = ({ selectedAccounts }) => {
    const [instIds, setInstIds] = useState('ETH-USDT-SWAP,BTC-USDT-SWAP');

    const handleClose = () => {
        if (selectedAccounts.length === 0) {
            alert('请至少选择一个账户');
            return;
        }
        const ids = instIds.split(',').map(id => id.trim()).filter(id => id);
        if (ids.length === 0) {
            alert('请输入至少一个合约ID');
            return;
        }
        fetch(`${API_BASE_URL}/api/emergency_close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_indices: selectedAccounts, inst_ids: ids }),
        })
            .then(res => res.json())
            .then(data => alert(`紧急平仓结果: ${JSON.stringify(data, null, 2)}`))
            .catch(err => alert(`紧急平仓异常: ${err.toString()}`));
    };

    return (
        <div className="card">
            <h2>批量紧急平仓</h2>
            <div className="form-group">
                <label>合约ID（逗号分隔）</label>
                <input className="input" value={instIds} onChange={e => setInstIds(e.target.value)} />
            </div>
            <button className="button button-danger" onClick={handleClose}>一键平仓</button>
        </div>
    );
};

function App() {
    const [accountNames, setAccountNames] = useState<string[]>([]);
    const [accounts, setAccounts] = useState<{ [idx: number]: { balance: BalanceData[]; positions: Position[] } }>({});
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/account_names`)
            .then(res => res.json())
            .then(data => {
                if (data.account_names) setAccountNames(data.account_names);
            });
    }, []);

    useEffect(() => {
        const ws = new WebSocket('ws://127.0.0.1:8000/ws');
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.account !== undefined && msg.data) {
                const d = msg.data[0];
                setAccounts(prev => ({
                    ...prev,
                    [msg.account]: {
                        balance: d.balData || [],
                        positions: d.posData || [],
                    }
                }));
            }
        };
        return () => ws.close();
    }, []);

    return (
        <div className="App">
            <h1 className="header">OKX 多账户持仓与余额看板</h1>
            <div className="main-content">
                <div className="control-panel">
                    <AccountSelector accounts={accountNames} selectedAccounts={selectedAccounts} onChange={setSelectedAccounts} />
                    <PlaceOrder selectedAccounts={selectedAccounts} />
                    <EmergencyClose selectedAccounts={selectedAccounts} />
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
                    {accountNames.map((name, idx) => (
                        <AccountCard
                            key={idx}
                            name={name}
                            balance={accounts[idx]?.balance || []}
                            positions={accounts[idx]?.positions || []}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
