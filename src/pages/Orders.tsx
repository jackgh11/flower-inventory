import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Trash2, ShoppingBag } from 'lucide-react';

export default function Orders({ isRTL }: { isRTL: boolean }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [bouquets, setBouquets] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    customer_name: '', total_price: 0, items: [] as any[]
  });

  const fetchData = async () => {
    try {
      const [ordRes, bqRes, mtRes] = await Promise.all([
        axios.get('/api/orders'),
        axios.get('/api/bouquets'),
        axios.get('/api/materials')
      ]);
      setOrders(ordRes.data);
      setBouquets(bqRes.data);
      setMaterials(mtRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const calculateTotal = (items: any[]) => {
    let sum = 0;
    items.forEach(item => {
      sum += (item.quantity * item.price) || 0;
    });
    setFormData(prev => ({ ...prev, total_price: sum }));
  };

  const addItemToOrder = () => {
    const newItems = [...formData.items, { item_type: 'bouquet', item_id: '', quantity: 1, price: 0 }];
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index: number, key: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [key]: value };
    
    // Auto populate price based on selection
    if (key === 'item_id') {
      if (newItems[index].item_type === 'bouquet') {
        const b = bouquets.find(x => x.id === value);
        if (b) newItems[index].price = b.selling_price || 0;
      } else if (newItems[index].item_type === 'material') {
        const m = materials.find(x => x.id === value);
        // Assuming we have selling price for materials, or we just input 0 and let user change
        if (m) newItems[index].price = m.price || 0; // Cost price as placeholder
      }
    }
    
    setFormData({ ...formData, items: newItems });
    calculateTotal(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...formData.items];
    newItems.splice(index, 1);
    setFormData({ ...formData, items: newItems });
    calculateTotal(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/orders', formData);
      setShowModal(false);
      fetchData(); // Refresh history and orders
    } catch (err) {
      console.error(err);
      alert('Error saving order. Make sure database logic runs properly.');
    }
  };

  return (
    <div>
      <header>
        <h1>{isRTL ? 'إدارة الطلبات والمبيعات' : 'Orders & Sales'}</h1>
        <button className="btn" onClick={() => {
          setFormData({ customer_name: '', total_price: 0, items: [] });
          setShowModal(true);
        }}>
          <ShoppingBag size={18} /> {isRTL ? 'إضافة طلب جديد' : 'New Order'}
        </button>
      </header>

      <div className="card">
        {orders.length === 0 ? (
          <p>{isRTL ? 'لا يوجد طلبات حاليا' : 'No orders found.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>{isRTL ? 'الزبون' : 'Customer'}</th>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                <th>{isRTL ? 'تفاصيل الطلب' : 'Order Details'}</th>
                <th>{isRTL ? 'الإجمالي' : 'Total'}</th>
                <th>{isRTL ? 'الحالة' : 'Status'}</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => (
                <tr key={o.id}>
                  <td><strong>#{o.id}</strong></td>
                  <td>{o.customer_name || (isRTL ? 'غير معروف' : 'Unknown')}</td>
                  <td>{new Date(o.date).toLocaleDateString()}</td>
                  <td>
                    <ul style={{ margin: 0, paddingLeft: isRTL ? 0 : '1.2rem', paddingRight: isRTL ? '1.2rem' : 0, fontSize: '0.9em' }}>
                      {o.items && o.items.map((it: any, i: number) => {
                        const source = it.item_type === 'bouquet' ? bouquets : materials;
                        const match = source.find(x => x.id === it.item_id);
                        return (
                          <li key={i}>
                            <strong>{it.quantity}x</strong> {match ? (match.name_en || match.name_ar || match.name) : 'Item Deleted'} ({it.item_type}) 
                            - <span style={{ color: 'var(--color-primary)' }}>₪{(it.price * it.quantity).toFixed(2)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </td>
                  <td><strong>₪{(o.total_price || 0).toFixed(2)}</strong></td>
                  <td><span className="badge ok">{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{isRTL ? 'إنشاء طلب جديد' : 'Create Order'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>{isRTL ? 'اسم الزبون (اختياري)' : 'Customer Name (Optional)'}</label>
                <input type="text" value={formData.customer_name} onChange={e => setFormData({...formData, customer_name: e.target.value})} />
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isRTL ? 'العناصر المباعة (باقات ومواد)' : 'Order Items (Bouquets & Materials)'}</span>
                  <button type="button" className="btn secondary" onClick={addItemToOrder} style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}>
                    + {isRTL ? 'إضافة عنصر للطلب' : 'Add Order Item'}
                  </button>
                </label>
                
                {formData.items.length === 0 ? (
                  <p style={{ fontSize:'0.9rem', color:'var(--color-text-light)' }}>{isRTL ? 'لم يتم إضافة عناصر للطلب.' : 'No items added to order.'}</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--color-bg)', padding: '1rem', borderRadius: '8px' }}>
                    {formData.items.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <select 
                          value={item.item_type} 
                          onChange={(e) => {
                            updateItem(idx, 'item_type', e.target.value);
                            updateItem(idx, 'item_id', '');
                          }}
                          style={{ width: '100px' }}
                        >
                          <option value="bouquet">{isRTL ? 'باقة جاهزة' : 'Bouquet'}</option>
                          <option value="material">{isRTL ? 'مادة/شريط' : 'Material'}</option>
                        </select>
                        
                        <select 
                          required 
                          value={item.item_id} 
                          onChange={(e) => updateItem(idx, 'item_id', parseInt(e.target.value))}
                          style={{ flex: 1, minWidth: '150px' }}
                        >
                          <option value="" disabled>{isRTL ? 'القائمة...' : 'Select Inventory...'}</option>
                          {(item.item_type === 'bouquet' ? bouquets : materials).map(opt => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name_en || opt.name_ar || opt.name} {opt.selling_price ? `- ₪${opt.selling_price}` : ''}
                            </option>
                          ))}
                        </select>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <small style={{ fontSize: '0.7em', color:'var(--color-text-light)' }}>{isRTL ? 'الكمية' : 'Qty'}</small>
                          <input 
                            type="number" 
                            required 
                            min="1" 
                            step="1" 
                            value={item.quantity} 
                            onChange={(e) => {
                              updateItem(idx, 'quantity', parseFloat(e.target.value));
                            }} 
                            style={{ width: '60px' }} 
                          />
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <small style={{ fontSize: '0.7em', color:'var(--color-text-light)' }}>{isRTL ? 'السعر (للحبة)' : 'Price (ea)'}</small>
                          <input 
                            type="number" 
                            required 
                            min="0" 
                            step="0.01" 
                            value={item.price} 
                            onChange={(e) => {
                              updateItem(idx, 'price', parseFloat(e.target.value) || 0);
                            }} 
                            style={{ width: '80px', border: '1px solid var(--color-primary)' }} 
                          />
                        </div>

                        <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', marginTop: '15px' }}>
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-group" style={{ textAlign: 'right', fontSize: '1.2rem' }}>
                <strong style={{ color: 'var(--color-primary)' }}>
                  {isRTL ? 'المجموع الكلي: ' : 'Total: '} ₪{formData.total_price.toFixed(2)}
                </strong>
              </div>

              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }} disabled={formData.items.length === 0}>
                {isRTL ? 'تأكيد الطلب وخصم المخزون' : 'Confirm Order & Deduct Stock'}
              </button>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-danger)', textAlign: 'center', marginTop: '0.5rem' }}>
                {isRTL ? 'سوف يتم خصم جميع البايبات والمواد المتعلقة فور التأكيد!' : 'All specific pipes and materials will be deducted instantly upon confirm!'}
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
