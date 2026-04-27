import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Trash2 } from 'lucide-react';

export default function Bouquets({ isRTL }: { isRTL: boolean }) {
  const [bouquets, setBouquets] = useState<any[]>([]);
  const [flowers, setFlowers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name_en: '', name_ar: '', name: '', photo_url: '', selling_price: 0, notes: '', items: [] as any[]
  });

  const fetchData = async () => {
    try {
      const [bqRes, flRes, mtRes] = await Promise.all([
        axios.get('/api/bouquets'),
        axios.get('/api/flowers'),
        axios.get('/api/materials')
      ]);
      setBouquets(bqRes.data);
      setFlowers(flRes.data);
      setMaterials(mtRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...formData, name: formData.name_en || formData.name_ar };
      await axios.post('/api/bouquets', payload);
      setShowModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const addItemToBouquet = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { item_type: 'flower', item_id: '', quantity: 1 }]
    });
  };

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    if (key === 'item_type') newItems[index].item_id = ''; // reset selection
    setFormData({ ...formData, items: newItems });
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this bouquet recipe?')) {
      await axios.delete(`/api/bouquets/${id}`);
      fetchData();
    }
  };

  return (
    <div>
      <header>
        <h1>{isRTL ? 'إدارة الباقات (الوصفات الجاهزة)' : 'Bouquets (Ready Recipes)'}</h1>
        <button className="btn" onClick={() => {
          setFormData({ name_en: '', name_ar: '', name: '', photo_url: '', selling_price: 0, notes: '', items: [] });
          setShowModal(true);
        }}>
          <Plus size={18} /> {isRTL ? 'باقة جديدة' : 'New Bouquet'}
        </button>
      </header>

      <div className="card">
        {bouquets.length === 0 ? (
          <p>{isRTL ? 'لا يوجد باقات حاليا' : 'No bouquets found.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{isRTL ? 'الصورة' : 'Photo'}</th>
                <th>{isRTL ? 'الاسم' : 'Name'}</th>
                <th>{isRTL ? 'مكونات الباقة' : 'Ingredients'}</th>
                <th>{isRTL ? 'سعر البيع' : 'Selling Price'}</th>
                <th>{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {bouquets.map((b: any) => (
                <tr key={b.id}>
                  <td>
                    {b.photo_url ? <img src={b.photo_url} alt="Bouquet" className="table-img" /> : <div className="table-img" style={{background:'#eee'}} />}
                  </td>
                  <td>
                    <strong>{b.name_en || b.name}</strong>
                    {b.name_ar && <span style={{ display: 'block', fontSize: '0.85em', color: 'var(--color-text-light)' }}>{b.name_ar}</span>}
                  </td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: isRTL ? 0 : '1rem', paddingRight: isRTL ? '1rem' : 0, fontSize: '0.9em' }}>
                      {b.items && b.items.map((it: any, i: number) => {
                        const source = it.item_type === 'flower' ? flowers : materials;
                        const match = source.find(x => x.id === it.item_id);
                        return (
                          <li key={i}>{it.quantity}x {match ? (match.name_en || match.name_ar || match.name) : 'Unknown'} ({it.item_type})</li>
                        );
                      })}
                    </ul>
                  </td>
                  <td>₪{(b.selling_price || 0).toFixed(2)}</td>
                  <td>
                    <button className="btn secondary" onClick={() => handleDelete(b.id)} style={{ color: 'var(--color-danger)', padding: '0.4rem' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{isRTL ? 'بناء باقة جديدة' : 'Build New Bouquet'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الاسم (حروف إنجليزية)' : 'Name (English)'}</label>
                  <input required type="text" value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الاسم (عربي)' : 'Name (Arabic)'}</label>
                  <input type="text" value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} />
                </div>
              </div>

              <div className="form-group">
                <label>{isRTL ? 'سعر البيع' : 'Selling Price (₪)'}</label>
                <input required type="number" step="0.01" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: parseFloat(e.target.value) || 0})} />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isRTL ? 'مكونات الباقة (الزهور والمواد)' : 'Bouquet Recipe (Flowers & Materials)'}</span>
                  <button type="button" className="btn secondary" onClick={addItemToBouquet} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                    + {isRTL ? 'إضافة مكون' : 'Add Item'}
                  </button>
                </label>
                
                {formData.items.length === 0 ? (
                  <p style={{ fontSize:'0.9rem', color:'var(--color-text-light)' }}>{isRTL ? 'لم يتم إضافة مكونات بعد.' : 'No components added yet.'}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg)', padding: '1rem', borderRadius: '8px' }}>
                    {formData.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select 
                          value={item.item_type} 
                          onChange={(e) => updateItem(idx, 'item_type', e.target.value)}
                          style={{ width: '100px' }}
                        >
                          <option value="flower">{isRTL ? 'زهرة' : 'Flower'}</option>
                          <option value="material">{isRTL ? 'مادة' : 'Material'}</option>
                        </select>
                        <select 
                          required 
                          value={item.item_id} 
                          onChange={(e) => updateItem(idx, 'item_id', parseInt(e.target.value))}
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          <option value="" disabled>{isRTL ? 'المكون...' : 'Component...'}</option>
                          {(item.item_type === 'flower' ? flowers : materials).map(opt => (
                            <option key={opt.id} value={opt.id}>{opt.name_en || opt.name_ar || opt.name}</option>
                          ))}
                        </select>
                        {/* Pipe selector removed per user request */}
                        <input 
                          type="number" 
                          required 
                          min="1" 
                          step="0.5" 
                          value={item.quantity} 
                          onChange={(e) => updateItem(idx, 'quantity', parseFloat(e.target.value))} 
                          style={{ width: '70px' }} 
                        />
                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label>{isRTL ? 'رابط الصورة المجمعة' : 'Photo URL'}</label>
                <input type="text" placeholder="http://..." value={formData.photo_url} onChange={e => setFormData({...formData, photo_url: e.target.value})} />
              </div>

              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={formData.items.length === 0}>
                {isRTL ? 'حفظ ووصفة الباقة' : 'Save Bouquet Recipe'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
