import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './App.css';
import Configuration from './Configuration';

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

const AccountCard: React.FC<{ name: string; balance: BalanceData[]; positions: Position[]; latestPrices: { [instId: string]: number } }> = ({ name, balance, positions, latestPrices }) => {
    const calculateUnrealizedPnl = (pos: Position, currentPrice: number) => {
        const avgPx = parseFloat(pos.avgPx);
        const posQty = parseFloat(pos.pos);
        const faceValue = 1; // Assuming default face value is 1, adjust if needed

        if (avgPx > 0 && posQty !== 0 && currentPrice > 0) {
            const pnl_multiplier = pos.posSide === 'long' ? 1 : -1;
            const unrealized = (currentPrice - avgPx) * posQty * faceValue * pnl_multiplier;
            const unrealizedPct = (unrealized / (avgPx * posQty * faceValue)) * 100;
            return { unrealized, unrealizedPct };
        }
        return { unrealized: 0, unrealizedPct: 0 };
    };

    return (
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
                        ) : positions.map((pos, i) => {
                            const currentPrice = latestPrices[pos.instId] || parseFloat(pos.avgPx);
                            const { unrealized, unrealizedPct } = calculateUnrealizedPnl(pos, currentPrice);

                            return (
                                <tr key={i}>
                                    <td>{pos.instId}</td>
                                    <td>{pos.posSide}</td>
                                    <td>{pos.pos}</td>
                                    <td>{pos.lever || 'N/A'}x</td>
                                    <td>{pos.avgPx}</td>
                                    <td>{currentPrice.toFixed(4)}</td>
                                    <td style={{ color: unrealized > 0 ? '#26A69A' : '#EF5350' }}>
                                        {unrealized.toFixed(2)} ({unrealizedPct.toFixed(2)}%)
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

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

const PlaceOrder: React.FC<{ selectedAccounts: number[], instIdConfigs: {id: string, enabled: boolean}[] }> = ({ selectedAccounts, instIdConfigs }) => {
    const [selectedInstIds, setSelectedInstIds] = useState<string[]>([]);
    const [size, setSize] = useState('1');

    const handleInstIdChange = (instId: string) => {
        setSelectedInstIds(prev =>
            prev.includes(instId)
                ? prev.filter(id => id !== instId)
                : [...prev, instId]
        );
    };

    const handleOrder = (side: 'buy' | 'sell') => {
        if (selectedAccounts.length === 0) {
            alert('请至少选择一个账户');
            return;
        }
        if (selectedInstIds.length === 0) {
            alert('请至少选择一个合约');
            return;
        }

        const promises = selectedInstIds.map(instId => {
            return fetch(`${API_BASE_URL}/api/place_order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    account_indices: selectedAccounts,
                    inst_id: instId,
                    order_size: size,
                    order_side: side
                }),
            }).then(res => res.json());
        });

        Promise.all(promises)
            .then(results => alert(`下单结果: ${JSON.stringify(results, null, 2)}`))
            .catch(err => alert(`下单异常: ${err.toString()}`));
    };

    return (
        <div className="card">
            <h2>批量下单</h2>
            <div className="form-group">
                <label>合约ID</label>
                <div className="inst-selector">
                    {instIdConfigs.filter(c => c.enabled).map(c => (
                        <label key={c.id} className="inst-checkbox">
                            <input
                                type="checkbox"
                                checked={selectedInstIds.includes(c.id)}
                                onChange={() => handleInstIdChange(c.id)}
                            />
                            {c.id}
                        </label>
                    ))}
                </div>
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

const EmergencyClose: React.FC<{ selectedAccounts: number[]; accounts: { [idx: number]: { positions: Position[] } } }> = ({ selectedAccounts, accounts }) => {
    const [selectedInstIds, setSelectedInstIds] = useState<string[]>([]);

    const closableInstIds = useMemo(() => {
        const ids = new Set<string>();
        selectedAccounts.forEach(accIdx => {
            accounts[accIdx]?.positions.forEach(pos => {
                if (parseFloat(pos.pos) !== 0) {
                   ids.add(pos.instId);
                }
            });
        });
        return Array.from(ids);
    }, [selectedAccounts, accounts]);

    useEffect(() => {
        // Reset selection when closable instruments change
        setSelectedInstIds([]);
    }, [closableInstIds.toString()]);


    const handleInstIdChange = (instId: string) => {
        setSelectedInstIds(prev =>
            prev.includes(instId)
                ? prev.filter(id => id !== instId)
                : [...prev, instId]
        );
    };

    const handleClose = () => {
        if (selectedAccounts.length === 0) {
            alert('请至少选择一个账户');
            return;
        }
        if (selectedInstIds.length === 0) {
            alert('请至少选择一个要平仓的合约');
            return;
        }
        fetch(`${API_BASE_URL}/api/emergency_close`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ account_indices: selectedAccounts, inst_ids: selectedInstIds }),
        })
            .then(res => res.json())
            .then(data => alert(`紧急平仓结果: ${JSON.stringify(data, null, 2)}`))
            .catch(err => alert(`紧急平仓异常: ${err.toString()}`));
    };

    return (
        <div className="card">
            <h2>批量紧急平仓</h2>
            <div className="form-group">
                <label>选择持仓合约</label>
                <div className="inst-selector">
                    {closableInstIds.length > 0 ? closableInstIds.map(instId => (
                        <label key={instId} className="inst-checkbox">
                            <input
                                type="checkbox"
                                checked={selectedInstIds.includes(instId)}
                                onChange={() => handleInstIdChange(instId)}
                            />
                            {instId}
                        </label>
                    )) : <p style={{color: '#888'}}>无持仓合约</p>}
                </div>
            </div>
            <button className="button button-danger" onClick={handleClose} disabled={closableInstIds.length === 0}>一键平仓</button>
        </div>
    );
};

function App() {
    const [accountNames, setAccountNames] = useState<string[]>([]);
    const [accounts, setAccounts] = useState<{ [idx: number]: { balance: BalanceData[]; positions: Position[] } }>({});
    const [selectedAccounts, setSelectedAccounts] = useState<number[]>([]);
    const [instIdConfigs, setInstIdConfigs] = useState<{id: string, enabled: boolean}[]>([]);
    const [latestPrices, setLatestPrices] = useState<{ [instId: string]: number }>({});

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/account_names`)
            .then(res => res.json())
            .then(data => {
                if (data.account_names) setAccountNames(data.account_names);
            });
        
        fetch(`${API_BASE_URL}/api/config`)
            .then(res => res.json())
            .then(data => {
                if (data.batchOrderInstIds) {
                    setInstIdConfigs(data.batchOrderInstIds);
                }
            });
    }, []);

    useEffect(() => {
        const ws = new WebSocket('ws://127.0.0.1:8000/ws');
        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);
            if (msg.type === 'mark_price') {
                setLatestPrices(prev => ({
                    ...prev,
                    [msg.payload.instId]: msg.payload.markPx
                }));
            } else if (msg.account !== undefined && msg.data) {
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
        <Router>
            <div className="App">
                <nav className="header">
                    <Link to="/">主页</Link>
                    <Link to="/config">配置</Link>
                </nav>
                <div className="main-content">
                    <Routes>
                        <Route path="/" element={
                            <>
                                <div className="control-panel">
                                    <AccountSelector accounts={accountNames} selectedAccounts={selectedAccounts} onChange={setSelectedAccounts} />
                                    <PlaceOrder selectedAccounts={selectedAccounts} instIdConfigs={instIdConfigs} />
                                    <EmergencyClose selectedAccounts={selectedAccounts} accounts={accounts} />
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'center' }}>
                                    {accountNames.map((name, idx) => (
                                        <AccountCard
                                            key={idx}
                                            name={name}
                                            balance={accounts[idx]?.balance || []}
                                            positions={accounts[idx]?.positions || []}
                                            latestPrices={latestPrices}
                                        />
                                    ))}
                                </div>
                            </>
                        } />
                        <Route path="/config" element={<Configuration />} />
                    </Routes>
                </div>
            </div>
        </Router>
    );
}

export default App;
