import { useEffect, useState } from 'react';
import axios from 'axios';
import { Package, Flower, AlertTriangle, TrendingUp } from 'lucide-react';

export default function Dashboard({ isRTL }: { isRTL: boolean }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    axios.get('/api/dashboard').then(res => setStats(res.data)).catch(console.error);
  }, []);

  const getFirstPhoto = (photoUrl: string) => {
    if (!photoUrl) return '';
    try {
      const parsed = JSON.parse(photoUrl);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      return photoUrl;
    } catch {
      return photoUrl;
    }
  };

  if (!stats) return <div>{isRTL ? 'جاري التحميل...' : 'Loading...'}</div>;

  return (
    <div>
      <header>
        <h1>{isRTL ? 'لوحة القيادة' : 'Dashboard'}</h1>
      </header>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        <div className="card stat-card">
          <div className="icon-box"><Package /></div>
          <div>
            <p className="label">{isRTL ? 'إجمالي المواد' : 'Total Materials'}</p>
            <p className="value">{stats.totalMaterials}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-box"><Flower /></div>
          <div>
            <p className="label">{isRTL ? 'إجمالي الزهور' : 'Total Flowers'}</p>
            <p className="value">{stats.totalFlowers}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-box" style={{ background: '#FFE5E5', color: '#D14545' }}><AlertTriangle /></div>
          <div>
            <p className="label">{isRTL ? 'مخزون منخفض' : 'Low Stock Items'}</p>
            <p className="value">{stats.lowStockMaterials?.length || 0}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-box" style={{ background: '#E5F3E5', color: '#458B45' }}><TrendingUp /></div>
          <div>
            <p className="label">{isRTL ? 'قيمة المخزون' : 'Inventory Value'}</p>
            <p className="value">₪{(stats.totalInventoryValue || 0).toFixed(2)}</p>
          </div>
        </div>
        <div className="card stat-card">
          <div className="icon-box" style={{ background: '#F6EDFF', color: '#7D52C7' }}><Package /></div>
          <div>
            <p className="label">{isRTL ? 'مواد بموردين متعددين' : 'Multi-Supplier Materials'}</p>
            <p className="value">{stats.multiSupplierMaterialCount || 0}</p>
          </div>
        </div>
      </div>

      {stats.lowStockByCategory?.length > 0 && (
        <div className="card" style={{ marginBottom: '1.25rem' }}>
          <h3>{isRTL ? 'المخزون المنخفض حسب الفئة' : 'Low Stock by Category'}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {stats.lowStockByCategory.map((entry: any) => (
              <span key={entry.category} className="badge low">
                {entry.category}: {entry.low_count}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <h3>{isRTL ? 'المواد منخفضة المخزون' : 'Low Stock Alert'}</h3>
        {!stats.lowStockMaterials || stats.lowStockMaterials.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'جميع المنتجات جيدة.' : 'All items are well stocked.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{isRTL ? 'الصورة' : 'Picture'}</th>
                <th>{isRTL ? 'الاسم' : 'Item Name'}</th>
                <th>{isRTL ? 'كمية' : 'Quantity'}</th>
                <th>{isRTL ? 'المورد' : 'Supplier Name'}</th>
              </tr>
            </thead>
            <tbody>
              {stats.lowStockMaterials.map((m: any) => (
                <tr key={m.id}>
                  <td>
                    {getFirstPhoto(m.photo_url) ? (
                      <img src={getFirstPhoto(m.photo_url)} alt={m.name_en || m.name_ar || m.name} className="table-img" />
                    ) : (
                      <div className="table-img" style={{ background: '#eee' }} />
                    )}
                  </td>
                  <td>{isRTL ? m.name_ar || m.name_en || m.name : m.name_en || m.name_ar || m.name}</td>
                  <td><span className="badge low">{m.quantity} {m.unit}</span></td>
                  <td>{m.supplier_name || (isRTL ? 'غير محدد' : 'N/A')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
