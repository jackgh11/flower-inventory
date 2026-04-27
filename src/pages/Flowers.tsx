import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, ShoppingCart, History, Edit2, Trash2 } from 'lucide-react';

export default function Flowers({ isRTL }: { isRTL: boolean }) {
  const [flowers, setFlowers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [restockModal, setRestockModal] = useState<any>(null);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [editingHistoryData, setEditingHistoryData] = useState<any>({});
  const [photoMode, setPhotoMode] = useState<'url' | 'upload'>('url');
  const [lightbox, setLightbox] = useState<{photos: string[], index: number} | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name_en: '', name_ar: '', color: '', photo_url: '', supplier_name: '', supplier_url: '', pipes_needed: 0
  });

  const fetchFlowers = () => {
    axios.get('/api/flowers').then(res => setFlowers(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchFlowers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/api/flowers/${editId}`, formData);
      } else {
        await axios.post('/api/flowers', formData);
      }
      setShowModal(false);
      setPhotoMode('url');
      setEditId(null);
      fetchFlowers();
      setFormData({ name_en: '', name_ar: '', color: '', photo_url: '', supplier_name: '', supplier_url: '', pipes_needed: 0 });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(window.confirm(isRTL ? `هل أنت متأكد من حذف ${name || 'الزهرة'}؟` : `Are you sure you want to delete ${name || 'this flower'}?`)) {
      try {
        await axios.delete(`/api/flowers/${id}`);
        fetchFlowers();
      } catch (err) { console.error(err); }
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post(`/api/flowers/${restockModal.id}/restock`, {
        quantity: restockModal.addQuantity,
        unit_price: parseFloat((restockModal.price / (restockModal.addQuantity || 1)).toFixed(2)),
        total_price: restockModal.price,
        supplier_name: restockModal.supplier_name,
        supplier_url: restockModal.supplier_url,
        color: restockModal.color
      });
      setRestockModal(null);
      fetchFlowers();
    } catch(err) { console.error(err); }
  };

  const showHistory = async (f: any) => {
    try {
      const res = await axios.get(`/api/flowers/${f.id}/history`);
      setHistoryModal({ item: f, history: res.data });
    } catch (err) { console.error(err); }
  };

  const deleteHistory = async (hId: string) => {
    if(window.confirm(isRTL ? 'متأكد من حذف هذا السجل؟' : 'Delete this history record?')) {
      try {
        await axios.delete(`/api/history/${hId}`);
        showHistory(historyModal.item);
        fetchFlowers();
      } catch(err) { console.error(err); }
    }
  };

  const saveHistoryEdit = async (hId: string) => {
    try {
      await axios.put(`/api/history/${hId}`, editingHistoryData);
      setEditingHistoryId(null);
      showHistory(historyModal.item);
      fetchFlowers();
    } catch(err) { console.error(err); }
  };

  const getPhotos = (str: string) => {
    if(!str) return [];
    try {
      const parsed = JSON.parse(str);
      return Array.isArray(parsed) ? parsed : [str];
    } catch {
      return [str];
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedFlowers = [...flowers].sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    let valA = (a[key] || '').toString().toLowerCase();
    let valB = (b[key] || '').toString().toLowerCase();
    if (key === 'name') {
      valA = (a.name_en || a.name_ar || a.name || '').toLowerCase();
      valB = (b.name_en || b.name_ar || b.name || '').toLowerCase();
    }
    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return (
    <div>
      <header>
        <h1>{isRTL ? 'أنواع الزهور' : 'Flower Types'}</h1>
        <button className="btn" onClick={() => {
          setFormData({ name_en: '', name_ar: '', color: '', photo_url: '', supplier_name: '', supplier_url: '', pipes_needed: 0 });
          setPhotoMode('url');
          setEditId(null);
          setShowModal(true);
        }}>
          <Plus size={18} />
          {isRTL ? 'إضافة زهرة جديدة' : 'Add New Flower'}
        </button>
      </header>
      
      <div className="card">
        {flowers.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'لا توجد زهور بعد.' : 'No flowers added yet.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{isRTL ? 'الصور' : 'Photos'}</th>
                <th onClick={() => handleSort('name')} style={{cursor: 'pointer', userSelect: 'none'}}>{isRTL ? 'الاسم ↕' : 'Name ↕'}</th>
                <th>{isRTL ? 'البايبات' : 'Pipes Required'}</th>
                <th>{isRTL ? 'الكمية' : 'Stock'}</th>
                <th>{isRTL ? 'سعر الوحدة' : 'Price/Unit'}</th>
                <th>{isRTL ? 'السعر الإجمالي' : 'Total Value'}</th>
                <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                <th>{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedFlowers.map((f: any, idx: number) => {
                const photos = getPhotos(f.photo_url);
                return (
                <tr key={f.id}>
                  <td>{idx + 1}</td>
                  <td>
                    {photos.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', cursor: 'pointer' }} onClick={() => setLightbox({ photos, index: 0 })}>
                        <img src={photos[0]} alt="img" className="table-img" />
                        {photos.length > 1 && <span style={{ fontSize: '0.8rem', alignSelf: 'center', color: 'var(--color-primary)' }}>+{photos.length - 1}</span>}
                      </div>
                    ) : (
                      <div className="table-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', color: '#ccc' }}>No IMG</div>
                    )}
                  </td>
                  <td>
                    <strong>{f.name_en || f.name}</strong>
                    {f.name_ar && <span style={{ display: 'block', fontSize: '0.85em', color: 'var(--color-text-light)' }}>{f.name_ar}</span>}
                  </td>
                  <td><span className="badge low">{f.pipes_needed || 0}</span></td>
                  <td><span className="badge ok">{f.quantity}</span></td>
                  <td>₪{(f.price_per_unit || 0).toFixed(2)}</td>
                  <td>₪{((f.price_per_unit || 0) * (f.quantity || 0)).toFixed(2)}</td>
                  <td>
                    {f.supplier_name && <div>{f.supplier_name}</div>}
                    {f.supplier_url && <a href={f.supplier_url.startsWith('http') ? f.supplier_url : `https://${f.supplier_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.9em' }}>{isRTL ? 'زيارة الرابط' : 'Link'}</a>}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn secondary" onClick={() => setRestockModal({ id: f.id, name: isRTL ? f.name_ar || f.name_en || f.name : f.name_en || f.name_ar || f.name, addQuantity: 0, price: f.price_per_unit || 0, supplier_name: f.supplier_name || '', supplier_url: f.supplier_url || '' })} title={isRTL ? 'شراء المزيد' : 'Restock'} style={{ padding: '0.4rem' }}>
                      <ShoppingCart size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => showHistory(f)} title={isRTL ? 'تاريخ الشراء' : 'History'} style={{ padding: '0.4rem' }}>
                      <History size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => {
                      setEditId(f.id);
                      setFormData({
                        name_en: f.name_en || f.name || '', name_ar: f.name_ar || '', color: f.color || '', photo_url: f.photo_url || '', supplier_name: f.supplier_name || '', supplier_url: f.supplier_url || '', pipes_needed: f.pipes_needed || 0
                      });
                      setPhotoMode(f.photo_url ? 'url' : 'upload');
                      setShowModal(true);
                    }} title={isRTL ? 'تعديل' : 'Edit'} style={{ padding: '0.4rem' }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => handleDelete(f.id, isRTL ? f.name_ar || f.name_en : f.name_en || f.name_ar)} title={isRTL ? 'حذف' : 'Delete'} style={{ padding: '0.4rem', color: 'var(--color-danger)' }}>
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{editId ? (isRTL ? 'تعديل زهرة' : 'Edit Flower') : (isRTL ? 'إضافة زهرة' : 'Add Flower')}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الاسم (عربي)' : 'Arabic Name'}</label>
                  <input required type="text" value={formData.name_ar} onChange={e => setFormData({...formData, name_ar: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الاسم (إنجليزي)' : 'English Name'}</label>
                  <input required type="text" value={formData.name_en} onChange={e => setFormData({...formData, name_en: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>{isRTL ? 'عدد البايبات المطلوبة (لكل زهرة)' : 'Pipes needed (per flower)'}</label>
                <input required type="number" step="0.5" placeholder="e.g. 5" value={formData.pipes_needed} onChange={e => setFormData({...formData, pipes_needed: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="form-group" style={{ display: 'none' }}>
                <input type="hidden" value={formData.color} />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{isRTL ? 'الصورة' : 'Photo'}</span>
                  <button type="button" onClick={() => {
                    setPhotoMode(p => p === 'url' ? 'upload' : 'url');
                    setFormData({...formData, photo_url: ''});
                  }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
                    {photoMode === 'url' ? (isRTL ? 'رفع صورة بدلاً من ذلك' : 'Upload instead') : (isRTL ? 'استخدام رابط بدلاً من ذلك' : 'Use URL instead')}
                  </button>
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}>
                  {photoMode === 'url' ? (
                    <input type="text" placeholder='["http://...", "/uploads/..."] OR single URL' value={formData.photo_url} onChange={e => setFormData({...formData, photo_url: e.target.value})} style={{ flex: 1 }} />
                  ) : (
                    <div style={{ flex: 1, border: '2px dashed var(--color-primary-light)', padding: '1rem', borderRadius: '8px', textAlign: 'center', background: 'var(--color-bg)', cursor: 'pointer', position: 'relative' }}>
                      <input type="file" accept="image/*" multiple onChange={async e => {
                        const files = e.target.files;
                        if (!files || files.length === 0) return;
                        const fd = new FormData();
                        for (let i=0; i<files.length; i++) fd.append('images', files[i]);
                        try {
                          const res = await axios.post('/api/upload', fd);
                          setFormData({...formData, photo_url: JSON.stringify(res.data.urls)});
                        } catch(err) {
                          console.error("Upload failed", err);
                        }
                      }} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }} />
                      <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>{isRTL ? 'اضغط لرفع صور متعددة' : 'Click here to upload multiple images'}</span>
                    </div>
                  )}
                  {formData.photo_url && (
                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {getPhotos(formData.photo_url).map((p, i) => (
                         <img key={i} src={p} alt="Preview" style={{ height: '60px', borderRadius: '4px', objectFit: 'cover' }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }}>
                {isRTL ? 'حفظ الزهرة' : 'Save Flower'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{isRTL ? 'شراء مخزون إضافي' : 'Restock Item'}</h2>
              <button className="modal-close" onClick={() => setRestockModal(null)}>&times;</button>
            </div>
            <p style={{ marginBottom: '1rem', color: 'var(--color-text-light)' }}>
              {isRTL ? 'تحديث المخزون لـ' : 'Updating stock for'}: <strong>{restockModal.name}</strong>
            </p>
            <form onSubmit={handleRestock}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الكمية المشتراة' : 'Quantity Bought'}</label>
                  <input required type="number" step="1" value={restockModal.addQuantity} onChange={e => setRestockModal({...restockModal, addQuantity: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'اللون' : 'Color'}</label>
                  <input type="text" placeholder="e.g. Red" value={restockModal.color || ''} onChange={e => setRestockModal({...restockModal, color: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>{isRTL ? 'التكلفة الإجمالية للشراء' : 'Total Cost of Purchase (₪)'}</label>
                <input required type="number" step="0.01" value={restockModal.price} onChange={e => setRestockModal({...restockModal, price: parseFloat(e.target.value)})} />
                {restockModal.addQuantity > 0 && restockModal.price > 0 && (
                   <small style={{display:'block', marginTop:'0.3rem', color:'var(--color-primary)'}}>
                      {isRTL ? 'سعر الوحدة الواحدة المُحتسب: ' : 'Calculated Unit Price: '} ₪{(restockModal.price / (restockModal.addQuantity || 1)).toFixed(2)}
                   </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'اسم المورد (المزرعة/المتجر)' : 'Supplier Name'}</label>
                  <input type="text" placeholder="e.g. Local Farm" value={restockModal.supplier_name} onChange={e => setRestockModal({...restockModal, supplier_name: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'رابط المورد' : 'Supplier Link'}</label>
                  <input type="text" placeholder="http://..." value={restockModal.supplier_url} onChange={e => setRestockModal({...restockModal, supplier_url: e.target.value})} />
                </div>
              </div>
              <button type="submit" className="btn" style={{ width: '100%', justifyContent: 'center' }}>
                {isRTL ? 'إضافة للمخزون' : 'Add to Stock'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>{isRTL ? 'سجل المشتريات' : 'Purchase History'}</h2>
              <button className="modal-close" onClick={() => setHistoryModal(null)}>&times;</button>
            </div>
            <h3 style={{ marginTop: 0 }}>{historyModal.item.name_ar || historyModal.item.name_en || historyModal.item.name}</h3>
            {historyModal.history.length === 0 ? (
              <p>{isRTL ? 'لا يوجد سجل' : 'No history found'}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th>{isRTL ? 'الكمية المضافة' : 'Qty Added'}</th>
                    <th>{isRTL ? 'السعر الإجمالي' : 'Total Price'}</th>
                    <th>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.history.map((h: any) => (
                    <tr key={h.id}>
                      <td>{new Date(h.date).toLocaleDateString()}</td>
                      {editingHistoryId === h.id ? (
                        <>
                          <td><input type="number" step="0.01" style={{width: '70px'}} value={editingHistoryData.quantity_change} onChange={e => setEditingHistoryData({...editingHistoryData, quantity_change: parseFloat(e.target.value)})} /></td>
                          <td><input type="number" step="0.01" style={{width: '70px'}} value={editingHistoryData.price} onChange={e => setEditingHistoryData({...editingHistoryData, price: parseFloat(e.target.value)})} /></td>
                          <td><span style={{ color: 'var(--color-primary)' }}>₪{(editingHistoryData.price / (editingHistoryData.quantity_change || 1)).toFixed(2)}</span></td>
                          <td><input type="text" placeholder="Name" style={{width: '70px', marginBottom: '2px'}} value={editingHistoryData.supplier_name} onChange={e => setEditingHistoryData({...editingHistoryData, supplier_name: e.target.value})} /><br/><input type="text" placeholder="URL" style={{width: '70px'}} value={editingHistoryData.supplier_url} onChange={e => setEditingHistoryData({...editingHistoryData, supplier_url: e.target.value})} /></td>
                          <td>
                            <button type="button" onClick={() => saveHistoryEdit(h.id)} style={{ padding:'0.2rem 0.5rem', marginRight: '5px' }} className="btn">Save</button>
                            <button type="button" onClick={() => setEditingHistoryId(null)} style={{ padding:'0.2rem 0.5rem' }} className="btn secondary">Cancel</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td><span className="badge ok">+{h.quantity_change}</span></td>
                          <td>₪{(h.price || 0).toFixed(2)}</td>
                          <td><span style={{ color: 'var(--color-primary)' }}>₪{(h.price / (h.quantity_change || 1)).toFixed(2)}</span></td>
                          <td>
                            {h.supplier_name && <div style={{ fontSize: '0.9em' }}>{h.supplier_name}</div>}
                            {h.supplier_url && (
                              <a href={h.supplier_url.startsWith('http') ? h.supplier_url : `https://${h.supplier_url}`} target="_blank" rel="noreferrer" style={{color:'var(--color-primary)', fontSize: '0.85em'}}>Link</a> 
                            )}
                          </td>
                          <td style={{ display: 'flex', gap: '0.3rem' }}>
                            <button type="button" onClick={() => { setEditingHistoryId(h.id); setEditingHistoryData({ quantity_change: h.quantity_change, price: h.price, supplier_name: h.supplier_name, supplier_url: h.supplier_url }); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer' }}>
                              <Edit2 size={14} />
                            </button>
                            <button type="button" onClick={() => deleteHistory(h.id)} style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}>
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {lightbox && (
        <div className="modal-overlay" style={{ zIndex: 1000 }} onClick={() => setLightbox(null)}>
          <div className="modal-content" style={{ background: 'transparent', boxShadow: 'none', maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
            <img src={lightbox.photos[lightbox.index]} alt="Large view" style={{ maxHeight: '80vh', maxWidth: '100%', borderRadius: '8px', objectFit: 'contain' }} />
            
            {lightbox.photos.length > 1 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn secondary" onClick={() => setLightbox({...lightbox, index: (lightbox.index - 1 + lightbox.photos.length) % lightbox.photos.length})}>
                  {isRTL ? 'السابق' : 'Prev'}
                </button>
                <div style={{ color: 'white', alignSelf: 'center', fontSize: '1.2rem', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                  {lightbox.index + 1} / {lightbox.photos.length}
                </div>
                <button className="btn secondary" onClick={() => setLightbox({...lightbox, index: (lightbox.index + 1) % lightbox.photos.length})}>
                  {isRTL ? 'التالي' : 'Next'}
                </button>
              </div>
            )}
            <button style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer' }} onClick={() => setLightbox(null)}>X</button>
          </div>
        </div>
      )}
    </div>
  );
}
