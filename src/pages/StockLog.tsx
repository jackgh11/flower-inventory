import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Search } from 'lucide-react';

type StockEvent = {
  id: string | number;
  date?: string;
  created_at?: string;
  item_type?: string;
  item_id?: string | number;
  item_name?: string;
  material_name?: string;
  flower_name?: string;
  quantity_change?: number;
  price?: number;
  supplier_name?: string;
  supplier_url?: string;
  color?: string;
  note?: string;
};

export default function StockLog({ isRTL }: { isRTL: boolean }) {
  const [events, setEvents] = useState<StockEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'flower' | 'material'>('all');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get('/api/history');
        setEvents(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error(err);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const getDisplayName = (event: StockEvent) =>
    event.item_name || event.material_name || event.flower_name || `${isRTL ? 'عنصر' : 'Item'} #${event.item_id ?? '-'}`;

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();

    return events.filter((event) => {
      const eventType = (event.item_type || '').toLowerCase();
      const typeMatch = typeFilter === 'all' || eventType === typeFilter;
      if (!typeMatch) return false;

      if (!q) return true;

      const haystack = [
        getDisplayName(event),
        event.supplier_name || '',
        event.note || '',
        event.color || '',
      ]
        .join(' ')
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [events, isRTL, query, typeFilter]);

  return (
    <div>
      <header>
        <h1>{isRTL ? 'سجل حركة المخزون' : 'Stock Movement Log'}</h1>
      </header>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{isRTL ? 'بحث' : 'Search'}</label>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', left: isRTL ? 'auto' : '12px', right: isRTL ? '12px' : 'auto', color: 'var(--color-text-light)' }} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={isRTL ? 'ابحث بالاسم أو المورد أو اللون' : 'Search by item, supplier, or color'}
                style={{ paddingLeft: isRTL ? '0.75rem' : '2rem', paddingRight: isRTL ? '2rem' : '0.75rem' }}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>{isRTL ? 'نوع العنصر' : 'Item Type'}</label>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as 'all' | 'flower' | 'material')}>
              <option value="all">{isRTL ? 'الكل' : 'All'}</option>
              <option value="flower">{isRTL ? 'زهور' : 'Flowers'}</option>
              <option value="material">{isRTL ? 'مواد' : 'Materials'}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'جاري تحميل السجل...' : 'Loading history...'}</p>
        ) : filteredEvents.length === 0 ? (
          <p style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'لا توجد نتائج مطابقة.' : 'No matching stock events found.'}</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>{isRTL ? 'التاريخ' : 'Date'}</th>
                <th>{isRTL ? 'النوع' : 'Type'}</th>
                <th>{isRTL ? 'العنصر' : 'Item'}</th>
                <th>{isRTL ? 'التغير' : 'Change'}</th>
                <th>{isRTL ? 'إجمالي التكلفة' : 'Total Cost'}</th>
                <th>{isRTL ? 'المورد' : 'Supplier'}</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((event) => {
                const dateValue = event.date || event.created_at;
                const qty = Number(event.quantity_change || 0);
                const isAdd = qty >= 0;

                return (
                  <tr key={event.id}>
                    <td>{dateValue ? new Date(dateValue).toLocaleDateString() : '-'}</td>
                    <td>
                      <span className={`badge ${event.item_type === 'material' ? 'low' : 'ok'}`}>
                        {event.item_type === 'material'
                          ? isRTL ? 'مادة' : 'Material'
                          : isRTL ? 'زهرة' : 'Flower'}
                      </span>
                    </td>
                    <td>
                      <strong>{getDisplayName(event)}</strong>
                      {event.color && (
                        <span style={{ display: 'block', fontSize: '0.85em', color: 'var(--color-text-light)' }}>
                          {isRTL ? 'اللون' : 'Color'}: {event.color}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isAdd ? 'ok' : 'low'}`}>
                        {isAdd ? '+' : ''}{qty}
                      </span>
                    </td>
                    <td>₪{Number(event.price || 0).toFixed(2)}</td>
                    <td>
                      {event.supplier_name ? (
                        <>
                          <div>{event.supplier_name}</div>
                          {event.supplier_url && (
                            <a
                              href={event.supplier_url.startsWith('http') ? event.supplier_url : `https://${event.supplier_url}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: 'var(--color-primary)', fontSize: '0.85em' }}
                            >
                              {isRTL ? 'الرابط' : 'Link'}
                            </a>
                          )}
                        </>
                      ) : (
                        <span style={{ color: 'var(--color-text-light)' }}>{isRTL ? 'غير متوفر' : 'N/A'}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
