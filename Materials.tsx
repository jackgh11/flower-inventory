import { useEffect, useState } from 'react';
import axios from 'axios';
import { Plus, ShoppingCart, History, Edit2, Trash2, Search } from 'lucide-react';

export default function Materials({ isRTL }: { isRTL: boolean }) {
  const [materials, setMaterials] = useState<any[]>([]);
  const [categoryRules, setCategoryRules] = useState<any[]>([]);
  const [ruleCategory, setRuleCategory] = useState('');
  const [ruleLimit, setRuleLimit] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [restockModal, setRestockModal] = useState<any>(null);
  const [historyModal, setHistoryModal] = useState<any>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<number | null>(null);
  const [editingHistoryData, setEditingHistoryData] = useState<any>(null);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [isNewUnit, setIsNewUnit] = useState(false);
  const [photoMode, setPhotoMode] = useState<'url' | 'upload'>('url');
  const [lightbox, setLightbox] = useState<{photos: string[], index: number} | null>(null);
  const [sortConfig, setSortConfig] = useState<{key: string, direction: 'asc'|'desc'} | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name_en: '', name_ar: '', category: '', color: '', unit: '', photo_url: '', supplier_name: '', supplier_url: '', low_stock_limit: 0, notes: ''
  });

  const fetchMaterials = () => {
    axios.get('/api/materials').then(res => setMaterials(res.data)).catch(console.error);
  };

  const fetchCategoryRules = () => {
    axios.get('/api/material-category-rules').then(res => setCategoryRules(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchMaterials();
    fetchCategoryRules();
  }, []);

  const saveCategoryRule = async () => {
    if (!ruleCategory.trim()) return;
    try {
      await axios.post('/api/material-category-rules', { category: ruleCategory.trim(), low_stock_limit: Number(ruleLimit || 0) });
      setRuleCategory('');
      setRuleLimit(0);
      fetchCategoryRules();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCategoryRule = async (category: string) => {
    try {
      await axios.delete(`/api/material-category-rules/${encodeURIComponent(category)}`);
      fetchCategoryRules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editId) {
        await axios.put(`/api/materials/${editId}`, formData);
      } else {
        await axios.post('/api/materials', formData);
      }
      setShowModal(false);
      setIsNewCategory(false);
      setPhotoMode('url');
      setEditId(null);
      fetchMaterials();
      setFormData({ name_en: '', name_ar: '', category: '', color: '', unit: '', photo_url: '', supplier_name: '', supplier_url: '', low_stock_limit: 0, notes: '' });
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if(window.confirm(isRTL ? `هل أنت متأكد من حذف ${name || 'العنصر'}؟` : `Are you sure you want to delete ${name || 'this item'}?`)) {
      try {
        await axios.delete(`/api/materials/${id}`);
        fetchMaterials();
      } catch (err) { console.error(err); }
    }
  };

  const handleRestock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const purchasedQuantity = Number(restockModal.purchasedQuantity || 0);
      const unitsPerPurchase = Number(restockModal.unitsPerPurchase || 0);
      const totalPrice = Number(restockModal.totalPrice || 0);
      await axios.post(`/api/materials/${restockModal.id}/restock`, {
        purchased_quantity: purchasedQuantity,
        purchase_unit_type: restockModal.purchaseUnitType,
        units_per_purchase: unitsPerPurchase,
        usable_unit_type: restockModal.usableUnitType,
        total_price: totalPrice,
        supplier_name: restockModal.supplier_name,
        supplier_url: restockModal.supplier_url,
        color: restockModal.color,
        notes: restockModal.notes || ''
      });
      setRestockModal(null);
      fetchMaterials();
    } catch(err) { console.error(err); }
  };

  const showHistory = async (m: any) => {
    try {
      const res = await axios.get(`/api/materials/${m.id}/history`);
      setHistoryModal({ item: m, history: res.data });
    } catch (err) { console.error(err); }
  };

  const deleteHistory = async (hId: string) => {
    if(window.confirm(isRTL ? 'متأكد من حذف هذا السجل؟' : 'Delete this history record?')) {
      try {
        await axios.delete(`/api/history/${hId}`);
        showHistory(historyModal.item);
        fetchMaterials();
      } catch(err) { console.error(err); }
    }
  };

  const startEditHistory = (h: any) => {
    setEditingHistoryId(h.id);
    setEditingHistoryData({
      purchased_quantity: Number(h.purchased_quantity ?? h.quantity_change ?? 0),
      purchase_unit_type: h.purchase_unit_type || 'unit',
      units_per_purchase: Number(h.units_per_purchase ?? 1),
      usable_unit_type: h.usable_unit_type || historyModal?.item?.unit || 'unit',
      price: Number(h.price || 0),
      supplier_name: h.supplier_name || '',
      supplier_url: h.supplier_url || '',
      notes: h.notes || '',
    });
  };

  const saveHistoryEdit = async () => {
    if (!editingHistoryId || !editingHistoryData) return;
    try {
      await axios.put(`/api/history/${editingHistoryId}`, editingHistoryData);
      setEditingHistoryId(null);
      setEditingHistoryData(null);
      await showHistory(historyModal.item);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert(isRTL ? 'فشل تعديل السجل' : 'Failed to update history row');
    }
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

  const filteredMaterials = materials.filter((m) => {
    if (filterCategory && m.category !== filterCategory) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const haystack = [
      m.name_en || '',
      m.name_ar || '',
      m.name || '',
      m.category || '',
      m.color || '',
      m.supplier_name || '',
      m.supplier_url || '',
      m.notes || '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });

  const sortedMaterials = [...filteredMaterials].sort((a, b) => {
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
        <h1>{isRTL ? 'المواد' : 'Materials Inventory'}</h1>
        <button className="btn" onClick={() => {
          setFormData({ name_en: '', name_ar: '', category: '', color: '', unit: '', photo_url: '', supplier_name: '', supplier_url: '', low_stock_limit: 0, notes: '' });
          setIsNewCategory(false);
          setPhotoMode('url');
          setEditId(null);
          setShowModal(true);
        }}>
          <Plus size={18} />
          {isRTL ? 'إضافة مادة جديدة' : 'Add New Material'}
        </button>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{isRTL ? 'بحث في المواد' : 'Search Materials'}</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  left: isRTL ? 'auto' : '12px',
                  right: isRTL ? '12px' : 'auto',
                  color: 'var(--color-text-light)',
                }}
              />
              <input
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setSearchQuery(searchDraft);
                }}
                placeholder={isRTL ? 'اسم / فئة / مورد / ملاحظات...' : 'Name / category / supplier / notes...'}
                style={{ paddingLeft: isRTL ? '0.75rem' : '2rem', paddingRight: isRTL ? '2rem' : '0.75rem' }}
              />
            </div>
            <button type="button" className="btn secondary" onClick={() => setSearchQuery(searchDraft)}>
              {isRTL ? 'بحث' : 'Search'}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => {
                setSearchDraft('');
                setSearchQuery('');
              }}
            >
              {isRTL ? 'مسح' : 'Clear'}
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem' }}>{isRTL ? 'شروط المخزون المنخفض حسب الفئة' : 'Low Stock Rules by Category'}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '180px' }}>
            <label>{isRTL ? 'الفئة' : 'Category'}</label>
            <input value={ruleCategory} onChange={(e) => setRuleCategory(e.target.value)} list="material-categories" placeholder={isRTL ? 'مثال: Ribbon' : 'e.g. Ribbon'} />
            <datalist id="material-categories">
              {[...new Set(materials.map(m => m.category).filter(Boolean))].map((c) => (
                <option key={c as string} value={c as string} />
              ))}
            </datalist>
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '150px' }}>
            <label>{isRTL ? 'حد المخزون المنخفض' : 'Low Stock Limit'}</label>
            <input type="number" min="0" step="0.01" value={ruleLimit} onChange={(e) => setRuleLimit(parseFloat(e.target.value) || 0)} />
          </div>
          <button type="button" className="btn secondary" onClick={saveCategoryRule}>
            {isRTL ? 'حفظ الشرط' : 'Save Rule'}
          </button>
        </div>
        {categoryRules.length > 0 && (
          <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {categoryRules.map((r: any) => (
              <span key={r.category} className="badge ok" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                {r.category}: {Number(r.low_stock_limit).toFixed(2)}
                <button type="button" onClick={() => deleteCategoryRule(r.category)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#458B45', padding: 0 }}>
                  <Trash2 size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      
      <div className="card">
        {materials.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'لا توجد مواد بعد.' : 'No materials added yet.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>{isRTL ? 'الصور' : 'Photos'}</th>
                <th onClick={() => handleSort('name')} style={{cursor: 'pointer', userSelect: 'none'}}>{isRTL ? 'الاسم ↕' : 'Name ↕'}</th>
                <th>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    <span onClick={() => handleSort('category')} style={{cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{isRTL ? 'الفئة ↕' : 'Category ↕'}</span>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.1rem', fontSize: '0.8rem', fontWeight: 'normal' }}>
                      <option value="">{isRTL ? 'الكل' : 'All'}</option>
                      {[...new Set(materials.map(m => m.category))].map(c => (
                        <option key={c as string} value={c as string}>{c as string}</option>
                      ))}
                    </select>
                  </div>
                </th>
                <th>{isRTL ? 'الكمية' : 'Stock'}</th>
                <th>{isRTL ? 'سعر الوحدة' : 'Price/Unit'}</th>
                <th>{isRTL ? 'السعر الإجمالي' : 'Total Value'}</th>
                <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                <th>{isRTL ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {sortedMaterials.map((m: any, idx: number) => {
                const photos = getPhotos(m.photo_url);
                return (
                <tr key={m.id}>
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
                    <strong>{m.name_en || m.name}</strong>
                    {m.name_ar && <span style={{ display: 'block', fontSize: '0.85em', color: 'var(--color-text-light)' }}>{m.name_ar}</span>}
                  </td>
                  <td><span className="badge ok">{m.category}</span></td>
                  <td>
                    <span className={`badge ${m.quantity <= m.low_stock_limit ? 'low' : 'ok'}`}>
                      {m.quantity} {m.unit}
                    </span>
                  </td>
                  <td>₪{(m.price || 0).toFixed(2)}</td>
                  <td>₪{((m.price || 0) * (m.quantity || 0)).toFixed(2)}</td>
                  <td>
                    {m.supplier_name && <div>{m.supplier_name}</div>}
                    {m.supplier_url && <a href={m.supplier_url.startsWith('http') ? m.supplier_url : `https://${m.supplier_url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)', fontSize: '0.9em' }}>{isRTL ? 'زيارة الرابط' : 'Link'}</a>}
                  </td>
                  <td style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button className="btn secondary" onClick={() => setRestockModal({
                      id: m.id,
                      name: isRTL ? m.name_ar || m.name_en || m.name : m.name_en || m.name_ar || m.name,
                      purchasedQuantity: 1,
                      purchaseUnitType: m.unit || 'piece',
                      unitsPerPurchase: 1,
                      usableUnitType: m.unit || 'piece',
                      totalPrice: 0,
                      supplier_name: m.supplier_name || '',
                      supplier_url: m.supplier_url || '',
                      color: m.color || '',
                      notes: ''
                    })} title={isRTL ? 'شراء المزيد' : 'Restock'} style={{ padding: '0.4rem' }}>
                      <ShoppingCart size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => showHistory(m)} title={isRTL ? 'تاريخ الشراء' : 'History'} style={{ padding: '0.4rem' }}>
                      <History size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => {
                      setEditId(m.id);
                      setFormData({
                        name_en: m.name_en || m.name || '', name_ar: m.name_ar || '', category: m.category || '', color: m.color || '', unit: m.unit || '', photo_url: m.photo_url || '', supplier_name: m.supplier_name || '', supplier_url: m.supplier_url || '', low_stock_limit: m.low_stock_limit || 0, notes: m.notes || ''
                      });
                      setPhotoMode(m.photo_url ? 'url' : 'upload');
                      setShowModal(true);
                    }} title={isRTL ? 'تعديل' : 'Edit'} style={{ padding: '0.4rem' }}>
                      <Edit2 size={16} />
                    </button>
                    <button className="btn secondary" onClick={() => handleDelete(m.id, isRTL ? m.name_ar || m.name_en : m.name_en || m.name_ar)} title={isRTL ? 'حذف' : 'Delete'} style={{ padding: '0.4rem', color: 'var(--color-danger)' }}>
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
              <h2 style={{ margin: 0 }}>{editId ? (isRTL ? 'تعديل مادة' : 'Edit Material') : (isRTL ? 'إضافة مادة' : 'Add Material')}</h2>
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
                <label>{isRTL ? 'الفئة' : 'Category'}</label>
                {isNewCategory || [...new Set(materials.map(m => m.category))].length === 0 ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input required type="text" placeholder="e.g. Ribbon, Box, Wrapping" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} style={{ flex: 1 }} />
                    {[...new Set(materials.map(m => m.category))].length > 0 && (
                      <button type="button" className="btn secondary" onClick={() => {setIsNewCategory(false); setFormData({...formData, category: materials[0]?.category || ''})}}>
                        {isRTL ? 'إلغاء' : 'Cancel'}
                      </button>
                    )}
                  </div>
                ) : (
                  <select required value={formData.category || ''} onChange={e => {
                    if(e.target.value === '_new') {
                      setIsNewCategory(true);
                      setFormData({...formData, category: ''});
                    } else {
                      setFormData({...formData, category: e.target.value});
                    }
                  }}>
                    {(!formData.category) && <option value="" disabled>Select Category</option>}
                    {[...new Set(materials.map(m => m.category))].map(cat => (
                      <option key={cat as string} value={cat as string}>{cat as string}</option>
                    ))}
                    <option value="_new">{isRTL ? '+ إضافة فئة جديدة' : '+ Add New Category'}</option>
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>{isRTL ? 'الوحدة' : 'Unit Type'}</label>
                {isNewUnit ? (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input required type="text" placeholder="e.g. rolls, meters, pieces" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} style={{ flex: 1 }} />
                    <button type="button" className="btn secondary" onClick={() => {setIsNewUnit(false); setFormData({...formData, unit: 'piece'})}}>
                      {isRTL ? 'إلغاء' : 'Cancel'}
                    </button>
                  </div>
                ) : (
                  <select required value={formData.unit || ''} onChange={e => {
                    if(e.target.value === '_new') {
                      setIsNewUnit(true);
                      setFormData({...formData, unit: ''});
                    } else {
                      setFormData({...formData, unit: e.target.value});
                    }
                  }}>
                    {(!formData.unit) && <option value="" disabled>Select Unit</option>}
                    {['piece', 'meter', 'roll', 'bundle'].map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                    {[...new Set(materials.map(m => m.unit))].filter(u => u && !['piece', 'meter', 'roll', 'bundle'].includes(u)).map(u => (
                      <option key={u as string} value={u as string}>{u as string}</option>
                    ))}
                    <option value="_new">{isRTL ? '+ وحدة أخرى' : '+ Other Unit'}</option>
                  </select>
                )}
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
                          // res.data.urls is an array. If we already had photos, we could append, but let's replace for simplicity
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
                {isRTL ? 'حفظ المادة' : 'Save Material'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {restockModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '560px' }}>
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
                  <input required type="number" min="0.01" step="0.01" value={restockModal.purchasedQuantity} onChange={e => setRestockModal({...restockModal, purchasedQuantity: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'اللون' : 'Color'}</label>
                  <input type="text" placeholder="e.g. Red" value={restockModal.color || ''} onChange={e => setRestockModal({...restockModal, color: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'نوع وحدة الشراء' : 'Purchase Unit Type'}</label>
                  <input required type="text" placeholder="piece, packet, roll, bundle, box..." value={restockModal.purchaseUnitType} onChange={e => setRestockModal({...restockModal, purchaseUnitType: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'الوحدات القابلة للاستخدام داخل كل وحدة شراء' : 'Usable Units in Each Purchase Unit'}</label>
                  <input required type="number" min="0.01" step="0.01" value={restockModal.unitsPerPurchase} onChange={e => setRestockModal({...restockModal, unitsPerPurchase: parseFloat(e.target.value) || 0})} />
                  <small style={{ color: 'var(--color-text-light)', display: 'block', marginTop: '0.25rem' }}>
                    {isRTL ? 'مثال: كل باكيت يحتوي 50 قطعة، اكتب 50' : 'Example: if 1 packet contains 50 pieces, enter 50'}
                  </small>
                </div>
              </div>
              <div className="form-group">
                <label>{isRTL ? 'نوع الوحدة القابلة للاستخدام' : 'Usable Unit Type'}</label>
                <input required type="text" placeholder="piece, meter, stem, sheet..." value={restockModal.usableUnitType} onChange={e => setRestockModal({...restockModal, usableUnitType: e.target.value})} />
              </div>
              <div className="form-group">
                <label>{isRTL ? 'التكلفة الإجمالية للشراء' : 'Total Cost of Purchase (₪)'}</label>
                <input required type="number" min="0" step="0.01" value={restockModal.totalPrice} onChange={e => setRestockModal({...restockModal, totalPrice: parseFloat(e.target.value) || 0})} />
                {restockModal.purchasedQuantity > 0 && restockModal.unitsPerPurchase > 0 && restockModal.totalPrice > 0 && (
                   <small style={{display:'block', marginTop:'0.3rem', color:'var(--color-primary)'}}>
                      {isRTL ? 'الكمية القابلة للاستخدام المضافة: ' : 'Total Usable Quantity Added: '}
                      {(restockModal.purchasedQuantity * restockModal.unitsPerPurchase).toFixed(2)} {restockModal.usableUnitType}
                      <br />
                      {isRTL ? 'تكلفة الوحدة القابلة للاستخدام: ' : 'Cost Per Usable Unit: '}
                      ₪{(restockModal.totalPrice / ((restockModal.purchasedQuantity * restockModal.unitsPerPurchase) || 1)).toFixed(4)}
                   </small>
                )}
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'اسم المورد (المتجر)' : 'Supplier Name'}</label>
                  <input type="text" placeholder="e.g. Local Market / Shein" value={restockModal.supplier_name} onChange={e => setRestockModal({...restockModal, supplier_name: e.target.value})} />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>{isRTL ? 'رابط المورد' : 'Supplier Link'}</label>
                  <input type="text" placeholder="http://..." value={restockModal.supplier_url} onChange={e => setRestockModal({...restockModal, supplier_url: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>{isRTL ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</label>
                <textarea rows={2} value={restockModal.notes || ''} onChange={e => setRestockModal({...restockModal, notes: e.target.value})} />
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
            <h3 style={{ marginTop: 0 }}>{historyModal.item.name}</h3>
            {(() => {
              const purchases = historyModal.history.filter((h: any) => Number(h.quantity_change || 0) > 0);
              const totalPaid = purchases.reduce((s: number, h: any) => s + Number(h.price || 0), 0);
              const totalUsableQty = purchases.reduce((s: number, h: any) => s + Number(h.total_usable_quantity ?? h.quantity_change ?? 0), 0);
              const avgUnit = totalUsableQty > 0 ? totalPaid / totalUsableQty : 0;
              const suppliers = purchases
                .filter((h: any) => (h.supplier_name || '').trim())
                .map((h: any) => ({
                  name: h.supplier_name.trim(),
                  unit: Number(h.unit_price ?? (Number(h.price || 0) / Math.max(Number(h.total_usable_quantity ?? h.quantity_change ?? 1), 1)))
                }));
              const uniqueSuppliers = [...new Set(suppliers.map((s: any) => s.name.toLowerCase()))].length;
              const cheapest = suppliers.length > 0 ? suppliers.reduce((best: any, cur: any) => cur.unit < best.unit ? cur : best, suppliers[0]) : null;

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.6rem', marginBottom: '0.9rem' }}>
                  <div className="badge ok">{isRTL ? 'إجمالي المشتريات' : 'Total Spent'}: ₪{totalPaid.toFixed(2)}</div>
                  <div className="badge ok">{isRTL ? 'إجمالي الكمية' : 'Total Qty'}: {totalUsableQty.toFixed(2)} {historyModal.item.unit}</div>
                  <div className="badge ok">{isRTL ? 'متوسط سعر الوحدة' : 'Avg Unit Cost'}: ₪{avgUnit.toFixed(4)}</div>
                  <div className="badge ok">{isRTL ? 'عدد الموردين' : 'Suppliers'}: {uniqueSuppliers}</div>
                  <div className="badge low">{isRTL ? 'أرخص مورد' : 'Cheapest Supplier'}: {cheapest ? `${cheapest.name} (₪${cheapest.unit.toFixed(4)})` : (isRTL ? 'غير متوفر' : 'N/A')}</div>
                </div>
              );
            })()}
            {historyModal.history.length === 0 ? (
              <p>{isRTL ? 'لا يوجد سجل' : 'No history found'}</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                    <th>{isRTL ? 'الشراء' : 'Purchase'}</th>
                    <th>{isRTL ? 'الكمية القابلة للاستخدام' : 'Usable Qty Added'}</th>
                    <th>{isRTL ? 'السعر الإجمالي' : 'Total Price'}</th>
                    <th>{isRTL ? 'سعر الوحدة' : 'Unit Price'}</th>
                    <th>{isRTL ? 'الوحدة' : 'Unit'}</th>
                    <th>{isRTL ? 'المورد' : 'Supplier'}</th>
                    <th>{isRTL ? 'ملاحظات' : 'Notes'}</th>
                    <th>{isRTL ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {historyModal.history.map((h: any) => (
                    <tr key={h.id}>
                      <td>{new Date(h.date).toLocaleDateString()}</td>
                      {editingHistoryId === h.id ? (
                        <>
                          <td>
                            <input type="number" min="0.01" step="0.01" value={editingHistoryData.purchased_quantity} onChange={e => setEditingHistoryData({ ...editingHistoryData, purchased_quantity: parseFloat(e.target.value) || 0 })} style={{ width: '80px' }} />
                            <input type="text" value={editingHistoryData.purchase_unit_type} onChange={e => setEditingHistoryData({ ...editingHistoryData, purchase_unit_type: e.target.value })} style={{ marginTop: '4px' }} />
                          </td>
                          <td>
                            <input type="number" min="0.01" step="0.01" value={editingHistoryData.units_per_purchase} onChange={e => setEditingHistoryData({ ...editingHistoryData, units_per_purchase: parseFloat(e.target.value) || 0 })} style={{ width: '80px' }} />
                            <input type="text" value={editingHistoryData.usable_unit_type} onChange={e => setEditingHistoryData({ ...editingHistoryData, usable_unit_type: e.target.value })} style={{ marginTop: '4px' }} />
                          </td>
                          <td><input type="number" min="0" step="0.01" value={editingHistoryData.price} onChange={e => setEditingHistoryData({ ...editingHistoryData, price: parseFloat(e.target.value) || 0 })} style={{ width: '90px' }} /></td>
                          <td>
                            <span style={{ color: 'var(--color-primary)' }}>
                              ₪{(editingHistoryData.price / ((editingHistoryData.purchased_quantity * editingHistoryData.units_per_purchase) || 1)).toFixed(4)}
                            </span>
                          </td>
                          <td>{editingHistoryData.usable_unit_type}</td>
                          <td>
                            <input type="text" placeholder="Name" value={editingHistoryData.supplier_name} onChange={e => setEditingHistoryData({ ...editingHistoryData, supplier_name: e.target.value })} style={{ marginBottom: '4px' }} />
                            <input type="text" placeholder="URL" value={editingHistoryData.supplier_url} onChange={e => setEditingHistoryData({ ...editingHistoryData, supplier_url: e.target.value })} />
                          </td>
                          <td>
                            <textarea rows={2} value={editingHistoryData.notes} onChange={e => setEditingHistoryData({ ...editingHistoryData, notes: e.target.value })} />
                          </td>
                          <td style={{ minWidth: '120px' }}>
                            <button type="button" className="btn" style={{ padding: '0.25rem 0.5rem', marginRight: '0.4rem' }} onClick={saveHistoryEdit}>
                              {isRTL ? 'حفظ' : 'Save'}
                            </button>
                            <button type="button" className="btn secondary" style={{ padding: '0.25rem 0.5rem' }} onClick={() => { setEditingHistoryId(null); setEditingHistoryData(null); }}>
                              {isRTL ? 'إلغاء' : 'Cancel'}
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <span className="badge ok">+{Number(h.purchased_quantity ?? h.quantity_change ?? 0).toFixed(2)}</span> {h.purchase_unit_type || '-'}
                          </td>
                          <td><span className="badge ok">+{Number(h.total_usable_quantity ?? h.quantity_change ?? 0).toFixed(2)}</span> {h.usable_unit_type || historyModal.item.unit}</td>
                          <td>₪{Number(h.price || 0).toFixed(2)}</td>
                          <td><span style={{ color: 'var(--color-primary)' }}>₪{Number(h.unit_price ?? ((h.price || 0) / ((h.total_usable_quantity ?? h.quantity_change) || 1))).toFixed(4)}</span></td>
                          <td>{h.usable_unit_type || historyModal.item.unit}</td>
                          <td>
                            {h.supplier_name && <div style={{ fontSize: '0.9em' }}>{h.supplier_name}</div>}
                            {h.supplier_url && (
                              <a href={h.supplier_url.startsWith('http') ? h.supplier_url : `https://${h.supplier_url}`} target="_blank" rel="noreferrer" style={{color:'var(--color-primary)', fontSize: '0.85em'}}>Link</a>
                            )}
                          </td>
                          <td>
                            <div style={{ fontSize: '0.85em', color: 'var(--color-text-light)' }}>{h.notes || '-'}</div>
                          </td>
                          <td style={{ minWidth: '70px' }}>
                            {Number(h.quantity_change || 0) > 0 && (
                              <button type="button" onClick={() => startEditHistory(h)} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', marginRight: '4px' }}>
                                <Edit2 size={14} />
                              </button>
                            )}
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
