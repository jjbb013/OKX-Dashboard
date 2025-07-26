import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://127.0.0.1:8000';

interface InstIdConfig {
    id: string;
    enabled: boolean;
}

const Configuration: React.FC = () => {
    const [configs, setConfigs] = useState<InstIdConfig[]>([]);
    const [newInstId, setNewInstId] = useState('');

    useEffect(() => {
        fetch(`${API_BASE_URL}/api/config`)
            .then(res => res.json())
            .then(data => {
                if (data.batchOrderInstIds) {
                    setConfigs(data.batchOrderInstIds);
                }
            });
    }, []);

    const handleSave = () => {
        fetch(`${API_BASE_URL}/api/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ batchOrderInstIds: configs }),
        })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert('配置已保存');
                } else {
                    alert('配置保存失败');
                }
            })
            .catch(err => alert(`配置保存异常: ${err.toString()}`));
    };

    const addInstId = () => {
        if (newInstId && !configs.find(c => c.id === newInstId)) {
            setConfigs([...configs, { id: newInstId, enabled: true }]);
            setNewInstId('');
        }
    };

    const removeInstId = (id: string) => {
        setConfigs(configs.filter(c => c.id !== id));
    };

    const toggleEnable = (id: string) => {
        setConfigs(configs.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
    };

    return (
        <div className="card">
            <h2>合约ID配置</h2>
            <div className="form-group">
                <label>新增合约ID</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <input className="input" value={newInstId} onChange={e => setNewInstId(e.target.value)} />
                    <button className="button button-primary" onClick={addInstId}>添加</button>
                </div>
            </div>
            <div>
                {configs.map(config => (
                    <div key={config.id} style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
                        <input type="checkbox" checked={config.enabled} onChange={() => toggleEnable(config.id)} />
                        <span style={{ flexGrow: 1, marginLeft: '10px' }}>{config.id}</span>
                        <button className="button button-danger" onClick={() => removeInstId(config.id)}>删除</button>
                    </div>
                ))}
            </div>
            <button className="button button-primary" onClick={handleSave} style={{ marginTop: '20px' }}>保存配置</button>
        </div>
    );
};

export default Configuration;
