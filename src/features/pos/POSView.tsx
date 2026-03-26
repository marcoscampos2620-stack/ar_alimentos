import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from '../../config/supabase';
import { Search, ShoppingCart, Trash2, X } from 'lucide-react';

// Components
import CategoryFilter from './components/CategoryFilter';
import ProductCard from './components/ProductCard';
import FloatingCart from './components/FloatingCart';
import PaymentModal from './components/PaymentModal';
import QuantityModal from './components/QuantityModal';
import SaleTypeModal from './components/SaleTypeModal';
import QuickCustomerForm from './components/QuickCustomerForm';
import CustomerSelectionModal from './components/CustomerSelectionModal';

interface Product {
  id: string;
  name: string;
  unit_type: string;
  price: number;
  stock_quantity: number;
  category_id?: string;
  image_url?: string;
  is_paused?: boolean;
}

interface Category {
  id: string;
  name: string;
}

interface Customer {
  id: string;
  name: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  subtotal: number;
}

const POSView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Fluxo de tipo de venda: choosing | selectingCustomer | registeringCustomer | active
  const [saleMode, setSaleMode] = useState<'choosing' | 'selectingCustomer' | 'registeringCustomer' | 'active'>('choosing');
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  // UI States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [showCartSummary, setShowCartSummary] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const [saleSuccess, setSaleSuccess] = useState<any>(null);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('pos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    const [pRes, cRes, custRes] = await Promise.all([
      supabase.from('products').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('customers').select('id, name').order('name')
    ]);

    if (pRes.data) setProducts(pRes.data);
    if (cRes.data) setCategories(cRes.data);
    if (custRes.data) setCustomers(custRes.data);
  };

  const addToCart = (product: Product, quantity: number) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing ? existing.quantity : 0;
    
    if (currentQty + quantity > product.stock_quantity) {
      alert(`Estoque insuficiente! Você já tem ${currentQty} no carrinho e o estoque total é ${product.stock_quantity}.`);
      return;
    }

    if (existing) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + quantity, subtotal: (item.quantity + quantity) * product.price }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity, subtotal: quantity * product.price }]);
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  const handleFinalize = async (method: string, invoiceNumber: number, dueDate?: string) => {
    if (cart.length === 0) return;
    setIsFinishing(true);

    try {
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert([{ 
          total_amount: total, 
          payment_method: method,
          customer_id: selectedCustomer || null,
          invoice_number: invoiceNumber
        }])
        .select()
        .single();

      if (saleError) throw saleError;

      for (const item of cart) {
        await supabase.from('sale_items').insert([{
          sale_id: sale.id,
          product_id: item.product.id,
          quantity: item.quantity,
          unit_price: item.product.price,
          subtotal: item.subtotal
        }]);

        await supabase.from('stock_movements').insert([{
          product_id: item.product.id,
          quantity: -item.quantity,
          type: 'out',
          reason: `Venda #${sale.id.slice(0, 8)}`
        }]);

        await supabase
          .from('products')
          .update({ stock_quantity: item.product.stock_quantity - item.quantity })
          .eq('id', item.product.id);
      }

      if (method === 'DEBT' && selectedCustomer) {
        // Registrar fiado individual na tabela customer_debts
        await supabase.from('customer_debts').insert([{
          customer_id: selectedCustomer,
          sale_id: sale.id,
          amount: total,
          due_date: dueDate
        }]);

        // Atualizar total_debt do cliente
        const { data: customer } = await supabase
          .from('customers')
          .select('total_debt')
          .eq('id', selectedCustomer)
          .single();
        
        const newDebt = (customer?.total_debt || 0) + total;
        await supabase
          .from('customers')
          .update({ total_debt: newDebt })
          .eq('id', selectedCustomer);
      }

      setSaleSuccess({
        id: sale.id,
        total: total,
        payment_method: method
      });

      setCart([]);
      setSelectedCustomer('');
      setSelectedCustomerName('');
      setShowPayment(false);
      setShowCartSummary(false);
      fetchData();
    } catch (error: any) {
      alert('Erro ao finalizar venda: ' + error.message);
    } finally {
      setIsFinishing(false);
    }
  };

  const total = cart.reduce((acc, item) => acc + item.subtotal, 0);

  const filteredProducts = products.filter(p => {
    const isAvailable = !p.is_paused;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategoryId === 'all' || p.category_id === selectedCategoryId;
    return isAvailable && matchesSearch && matchesCategory;
  });

  return (
    <div className="view pos-container">
      {/* Modal de escolha do tipo de venda */}
      {saleMode === 'choosing' && (
        <SaleTypeModal
          onQuickSale={() => {
            setSelectedCustomer('');
            setSelectedCustomerName('');
            setSaleMode('active');
          }}
          onCustomerSale={() => setSaleMode('selectingCustomer')}
          onClose={() => setSaleMode('active')}
        />
      )}

      {/* Busca/Seleção de cliente cadastrado */}
      {saleMode === 'selectingCustomer' && (
        <CustomerSelectionModal
          onSelect={(id, name) => {
            setSelectedCustomer(id);
            setSelectedCustomerName(name);
            setSaleMode('active');
          }}
          onNewCustomer={() => setSaleMode('registeringCustomer')}
          onBack={() => setSaleMode('choosing')}
        />
      )}

      {/* Formulário de cadastro rápido de cliente */}
      {saleMode === 'registeringCustomer' && (
        <QuickCustomerForm
          onClose={() => setSaleMode('selectingCustomer')}
          onCustomerCreated={(customerId, customerName) => {
            setSelectedCustomer(customerId);
            setSelectedCustomerName(customerName);
            setSaleMode('active');
            fetchData();
          }}
        />
      )}

      {/* Interface Principal do PDV: Só aparece quando o cliente já foi definido */}
      {saleMode === 'active' && (
        <div className="pos-active-layout fade-in">
          {/* Indicador de cliente selecionado */}
          {selectedCustomerName && (
            <div className="customer-banner fade-in">
              <span>👤 Cliente: <strong>{selectedCustomerName}</strong></span>
              <button 
                onClick={() => { 
                  setSelectedCustomer(''); 
                  setSelectedCustomerName(''); 
                  setSaleMode('choosing'); 
                }}
                title="Mudar Cliente"
              >
                Mudar
              </button>
            </div>
          )}

      <div className="pos-header">
        <div className="header-top">
          <h2>Cardápio</h2>
          <div className="search-pill shadow-sm">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="O que você procura?" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        
        <CategoryFilter 
          categories={categories} 
          selectedId={selectedCategoryId} 
          onSelect={setSelectedCategoryId} 
        />
      </div>

      <div className="pos-content">
        <div className="product-menu-grid">
          {filteredProducts.map(product => (
            <ProductCard 
              key={product.id} 
              product={product} 
              onClick={() => setSelectedProduct(product)} 
            />
          ))}
          {filteredProducts.length === 0 && (
            <div className="empty-menu">
              <ShoppingCart size={48} />
              <p>Nenhum item encontrado nesta categoria</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      {!showCartSummary && !showPayment && (
        <FloatingCart 
          itemCount={cart.length} 
          total={total} 
          onClick={() => setShowCartSummary(true)} 
        />
      )}
    </div>
  )}

      {/* Cart Summary Drawer/Modal */}
      {showCartSummary && (
        <div className="modal-overlay fade-in" onClick={() => setShowCartSummary(false)}>
          <div className="cart-drawer slide-up shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="handle"></div>
              <div className="title-row">
                <h3>Seu Carrinho</h3>
                <button className="btn-icon" onClick={() => setShowCartSummary(false)}><X size={20} /></button>
              </div>
            </div>

            <div className="drawer-content">
              {cart.map(item => (
                <div key={item.product.id} className="cart-row">
                  <div className="row-info">
                    <span className="name">{item.product.name}</span>
                    <span className="details">
                      {item.quantity.toFixed(item.product.unit_type === 'KG' ? 3 : 0)} {item.product.unit_type} x {formatCurrency(item.product.price)}
                    </span>
                  </div>
                  <div className="row-actions">
                    <span className="subtotal">{formatCurrency(item.subtotal)}</span>
                    <button className="btn-remove" onClick={() => removeFromCart(item.product.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && <p className="empty-cart">Seu carrinho está vazio</p>}
            </div>

            <div className="drawer-footer">
              <div className="total-bar">
                <span>Total</span>
                <span className="value">{formatCurrency(total)}</span>
              </div>
              <button 
                className="btn-primary btn-block btn-xl"
                disabled={cart.length === 0}
                onClick={() => {
                  setShowCartSummary(false);
                  setShowPayment(true);
                }}
              >
                Continuar para Pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      {selectedProduct && (
        <QuantityModal 
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAdd={(qty) => {
            addToCart(selectedProduct, qty);
            setSelectedProduct(null);
          }}
        />
      )}

      {showPayment && (
        <PaymentModal 
          total={total}
          selectedCustomerId={selectedCustomer}
          customers={customers}
          onSelectCustomer={setSelectedCustomer}
          onFinalize={(method, invNum, date) => handleFinalize(method, invNum, date)}
          onClose={() => setShowPayment(false)}
          loading={isFinishing}
        />
      )}

      {saleSuccess && (
        <div className="modal-overlay fade-in success-overlay">
          <div className="success-card slide-up shadow-2xl">
            <div className="success-icon">
              <ShoppingCart size={48} />
            </div>
            <h3>Venda Realizada!</h3>
            <p className="sale-id">Pedido #{saleSuccess.id.slice(0, 8)}</p>
            
            <div className="success-details">
              <div className="detail-row">
                <span>Total</span>
                <span className="val">{formatCurrency(saleSuccess.total)}</span>
              </div>
              <div className="detail-row">
                <span>Pagamento</span>
                <span className="val">{saleSuccess.payment_method}</span>
              </div>
            </div>

            <button 
              className="btn-primary btn-block btn-xl"
              onClick={() => {
                setSaleSuccess(null);
                setSaleMode('choosing');
              }}
            >
              Nova Venda
            </button>
          </div>
        </div>
      )}

      <style>{`
        .pos-container { padding-bottom: 100px; position: relative; min-height: 100vh; }
        .pos-header { position: sticky; top: 0; background: var(--bg-main); z-index: 100; padding-top: 10px; }

        .customer-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: #dbeafe;
          border: 1px solid #93c5fd;
          border-radius: 12px;
          margin-bottom: 12px;
          font-size: 0.88rem;
          font-weight: 600;
          color: #1e40af;
        }
        .customer-banner button {
          background: none;
          border: none;
          font-size: 1.1rem;
          cursor: pointer;
          color: #1e40af;
          padding: 2px 6px;
          border-radius: 6px;
        }
        .customer-banner button:hover { background: rgba(30,64,175,0.1); }
        .header-top { display: flex; align-items: center; justify-content: space-between; gap: 20px; margin-bottom: 15px; }
        .header-top h2 { font-weight: 900; font-size: 1.8rem; color: var(--text-main); }
        
        .search-pill { 
          flex: 1; 
          background: white; 
          display: flex; 
          align-items: center; 
          gap: 12px; 
          padding: 10px 18px; 
          border-radius: 30px; 
          border: 1px solid var(--border);
        }
        .search-pill input { border: none; outline: none; flex: 1; font-size: 0.9rem; font-weight: 600; }
        
        .product-menu-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
          gap: 12px;
          padding: 4px;
        }

        .cart-drawer {
          position: fixed;
          bottom: 0;
          left: var(--sidebar-width, 0);
          right: 0;
          width: calc(100vw - var(--sidebar-width, 0px));
          background: white;
          border-top-left-radius: 24px;
          border-top-right-radius: 24px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          z-index: 1100;
          padding-bottom: env(safe-area-inset-bottom);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @media (min-width: 769px) {
          .cart-drawer {
            top: 80px; /* Alinhado exatamente abaixo da TopBar desktop */
            right: 0;
            left: auto;
            bottom: 0;
            width: 420px;
            max-height: calc(100vh - 80px);
            border-radius: 0;
            border-left: 1px solid var(--border);
            box-shadow: -10px 0 30px rgba(0,0,0,0.05);
            animation: slideInRight 0.3s ease-out;
          }
          @keyframes slideInRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          .handle { display: none; }
        }

        @media (max-width: 768px) {
          .cart-drawer { 
            bottom: 85px; 
            border-radius: 24px; 
            width: 96%; 
            left: 2%; 
            margin-bottom: 10px;
          }
        }
        .drawer-header { padding: 12px 20px 20px; display: flex; flex-direction: column; align-items: center; }
        .handle { width: 40px; height: 4px; background: #e2e8f0; border-radius: 2px; margin-bottom: 15px; }
        .title-row { width: 100%; display: flex; justify-content: space-between; align-items: center; }
        .title-row h3 { font-weight: 800; }

        .drawer-content { flex: 1; overflow-y: auto; padding: 0 20px 20px; display: flex; flex-direction: column; gap: 16px; }
        .cart-row { display: flex; justify-content: space-between; align-items: center; padding-bottom: 12px; border-bottom: 1px solid var(--border); }
        .row-info { display: flex; flex-direction: column; gap: 2px; }
        .row-info .name { font-weight: 700; color: var(--text-main); }
        .row-info .details { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; }
        .row-actions { display: flex; align-items: center; gap: 12px; }
        .row-actions .subtotal { font-weight: 800; color: var(--primary); }
        .btn-remove { color: var(--error); padding: 4px; }

        .drawer-footer { 
          padding: 24px; 
          border-top: 1px solid var(--border); 
          background: white; 
          box-shadow: 0 -10px 25px rgba(0,0,0,0.03);
          z-index: 10;
        }
        .total-bar { 
          display: flex; 
          justify-content: space-between; 
          align-items: center; 
          margin-bottom: 20px; 
        }
        .total-bar span:first-child {
          font-size: 1rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .total-bar .value { 
          color: var(--text-main); 
          font-size: 2rem; 
          font-weight: 900;
          letter-spacing: -1px;
        }
        
        .empty-menu { grid-column: 1 / -1; text-align: center; padding: 60px; color: var(--text-muted); }
        
        .btn-xl { 
          padding: 18px; 
          font-size: 1.1rem; 
          border-radius: 16px; 
          font-weight: 800;
          justify-content: center;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 20px -5px rgba(59, 130, 246, 0.4);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .btn-xl:active { transform: scale(0.98); }
        .btn-xl:disabled { opacity: 0.5; box-shadow: none; transform: none; }

        .success-overlay { z-index: 2000; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); }
        .success-card {
          width: 90%;
          max-width: 360px;
          background: white;
          border-radius: 24px;
          padding: 30px;
          text-align: center;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .success-icon {
          width: 80px;
          height: 80px;
          background: #dcfce7;
          color: #166534;
          border-radius: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
        }
        .success-card h3 { font-size: 1.5rem; font-weight: 900; color: var(--text-main); }
        .sale-id { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); margin-top: -10px; }
        
        .success-details {
          background: #f8fafc;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .detail-row { display: flex; justify-content: space-between; font-weight: 700; font-size: 0.9rem; }
        .detail-row .val { color: var(--primary); }

        @media (max-width: 480px) {
          .product-menu-grid { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </div>
  );
};

export default POSView;
