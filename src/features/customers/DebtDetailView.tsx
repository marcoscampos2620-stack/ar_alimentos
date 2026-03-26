import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../../utils/formatCurrency';
import { supabase } from '../../config/supabase';
import { ArrowLeft, CheckCircle, XCircle, AlertTriangle, Calendar, Package, Undo2, Trash2 } from 'lucide-react';

interface CustomerDebt {
  id: string;
  sale_id: string;
  amount: number;
  due_date: string;
  status: string;
  paid_at: string | null;
  created_at: string;
}

interface SaleItem {
  id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  products: { name: string; unit_type: string } | null;
}

interface SaleInfo {
  id: string;
  total_amount: number;
  payment_method: string;
  created_at: string;
  invoice_number?: number;
  customers?: { name: string };
}

interface DebtDetailViewProps {
  debt: CustomerDebt;
  customerId: string;
  customerName: string;
  onBack: () => void;
  onUpdated: () => void;
}

const DebtDetailView: React.FC<DebtDetailViewProps> = ({ debt, customerId, customerName, onBack, onUpdated }) => {
  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'pay' | 'undo' | 'delete' | null>(null);

  const isPaid = debt.status === 'PAID';
  const isOverdue = new Date(debt.due_date + 'T23:59:59') < new Date();

  useEffect(() => {
    fetchSaleData();
  }, [debt.sale_id]);

  const fetchSaleData = async () => {
    setLoading(true);
    try {
      const [saleRes, itemsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('*, customers(name)')
          .eq('id', debt.sale_id)
          .single(),
        supabase
          .from('sale_items')
          .select('*, products(name, unit_type)')
          .eq('sale_id', debt.sale_id)
      ]);

      if (saleRes.data) setSaleInfo(saleRes.data);
      if (itemsRes.data) setSaleItems(itemsRes.data);
    } catch (error: any) {
      console.error('Erro ao carregar dados da venda:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    setProcessing(true);
    try {
      await supabase
        .from('customer_debts')
        .update({ status: 'PAID', paid_at: new Date().toISOString() })
        .eq('id', debt.id);

      await supabase.from('debt_payments').insert([{
        customer_id: customerId,
        amount_paid: debt.amount,
        debt_id: debt.id
      }]);

      const { data: customer } = await supabase
        .from('customers')
        .select('total_debt')
        .eq('id', customerId)
        .single();

      const newDebt = Math.max(0, (customer?.total_debt || 0) - debt.amount);
      await supabase
        .from('customers')
        .update({ total_debt: newDebt })
        .eq('id', customerId);

      onUpdated();
      onBack();
    } catch (error: any) {
      alert('Erro ao confirmar pagamento: ' + error.message);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleUndoPayment = async () => {
    setProcessing(true);
    try {
      await supabase
        .from('customer_debts')
        .update({ status: 'PENDING', paid_at: null })
        .eq('id', debt.id);

      await supabase
        .from('debt_payments')
        .delete()
        .eq('debt_id', debt.id);

      const { data: customer } = await supabase
        .from('customers')
        .select('total_debt')
        .eq('id', customerId)
        .single();

      const newDebt = (customer?.total_debt || 0) + debt.amount;
      await supabase
        .from('customers')
        .update({ total_debt: newDebt })
        .eq('id', customerId);

      onUpdated();
      onBack();
    } catch (error: any) {
      alert('Erro ao desfazer pagamento: ' + error.message);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  const handleDeleteDebt = async () => {
    setProcessing(true);
    try {
      // Se estava pendente, subtrair do total_debt
      if (debt.status === 'PENDING') {
        const { data: customer } = await supabase
          .from('customers')
          .select('total_debt')
          .eq('id', customerId)
          .single();

        const newDebt = Math.max(0, (customer?.total_debt || 0) - debt.amount);
        await supabase
          .from('customers')
          .update({ total_debt: newDebt })
          .eq('id', customerId);
      }

      // Deletar pagamentos associados
      await supabase
        .from('debt_payments')
        .delete()
        .eq('debt_id', debt.id);

      // Deletar a dívida
      await supabase
        .from('customer_debts')
        .delete()
        .eq('id', debt.id);

      onUpdated();
      onBack();
    } catch (error: any) {
      alert('Erro ao excluir fiado: ' + error.message);
    } finally {
      setProcessing(false);
      setConfirmAction(null);
    }
  };

  return (
    <div className="debt-detail-view fade-in">
      <div className="form-header-v2">
        <button className="btn-back" onClick={onBack}>
          <ArrowLeft size={20} />
        </button>
        <h2>Nota do Fiado</h2>
      </div>

      {loading ? (
        <div className="loading-placeholder">Carregando nota...</div>
      ) : (
        <div className="debt-detail-content">
          {/* Status Banner */}
          <div className={`status-banner ${isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending'}`}>
            {isPaid ? (
              <>
                <CheckCircle size={24} />
                <div className="status-text">
                  <span className="status-title">Pagamento Confirmado</span>
                  <span className="status-sub">Pago em {debt.paid_at ? new Date(debt.paid_at).toLocaleDateString('pt-BR') : '---'}</span>
                </div>
              </>
            ) : isOverdue ? (
              <>
                <AlertTriangle size={24} />
                <div className="status-text">
                  <span className="status-title">Fiado Vencido</span>
                  <span className="status-sub">Venceu em {new Date(debt.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </>
            ) : (
              <>
                <Calendar size={24} />
                <div className="status-text">
                  <span className="status-title">Pagamento Pendente</span>
                  <span className="status-sub">Vencimento: {new Date(debt.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                </div>
              </>
            )}
          </div>

          {/* Info Cabeçalho */}
          <div className="invoice-header">
            <div className="invoice-row">
              <span className="invoice-label">Cliente</span>
              <span className="invoice-value">{customerName}</span>
            </div>
            {saleInfo?.invoice_number && (
              <div className="invoice-row">
                <span className="invoice-label">Nota Nº</span>
                <span className="invoice-value highlight">{saleInfo.invoice_number}</span>
              </div>
            )}
            <div className="invoice-row">
              <span className="invoice-label">Data da Venda</span>
              <span className="invoice-value">
                {saleInfo ? new Date(saleInfo.created_at).toLocaleDateString('pt-BR') : '---'}
              </span>
            </div>
            <div className="invoice-row">
              <span className="invoice-label">Vencimento</span>
              <span className={`invoice-value ${isOverdue && !isPaid ? 'text-red' : ''}`}>
                {new Date(debt.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {/* Itens da Venda */}
          <div className="invoice-items-section">
            <h3 className="items-title">
              <Package size={18} />
              Itens da Nota
            </h3>

            {saleItems.length === 0 ? (
              <div className="no-items">Nenhum item encontrado para esta venda.</div>
            ) : (
              <div className="items-table">
                <div className="items-header">
                  <span className="col-name">Produto</span>
                  <span className="col-qty">Qtd</span>
                  <span className="col-price">Preço</span>
                  <span className="col-subtotal">Subtotal</span>
                </div>
                {saleItems.map(item => (
                  <div key={item.id} className="item-row">
                    <span className="col-name">{item.products?.name || 'Produto'}</span>
                    <span className="col-qty">
                      {Number(item.quantity).toFixed(item.products?.unit_type === 'KG' ? 3 : 0)} {item.products?.unit_type}
                    </span>
                    <span className="col-price">{formatCurrency(item.unit_price)}</span>
                    <span className="col-subtotal">{formatCurrency(item.subtotal)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Total */}
            <div className="invoice-total">
              <span>Total da Nota</span>
              <span className="total-value">{formatCurrency(debt.amount)}</span>
            </div>
          </div>

          {/* Ações de Confirmação */}
          <div className="detail-actions">
            {confirmAction === 'pay' ? (
              <div className="confirm-dialog">
                <p className="confirm-text">Tem certeza que deseja <strong>confirmar o pagamento</strong> deste fiado?</p>
                <div className="confirm-buttons">
                  <button className="btn-action confirm" onClick={handleConfirmPayment} disabled={processing}>
                    <CheckCircle size={18} />
                    {processing ? 'Processando...' : 'Sim, Confirmar'}
                  </button>
                  <button className="btn-action cancel" onClick={() => setConfirmAction(null)} disabled={processing}>
                    <XCircle size={18} />
                    Não, Voltar
                  </button>
                </div>
              </div>
            ) : confirmAction === 'undo' ? (
              <div className="confirm-dialog undo">
                <p className="confirm-text">Tem certeza que deseja <strong>desfazer o pagamento</strong>? O fiado voltará como pendente.</p>
                <div className="confirm-buttons">
                  <button className="btn-action undo-confirm" onClick={handleUndoPayment} disabled={processing}>
                    <Undo2 size={18} />
                    {processing ? 'Processando...' : 'Sim, Desfazer'}
                  </button>
                  <button className="btn-action cancel" onClick={() => setConfirmAction(null)} disabled={processing}>
                    <XCircle size={18} />
                    Não, Voltar
                  </button>
                </div>
              </div>
            ) : confirmAction === 'delete' ? (
              <div className="confirm-dialog delete">
                <p className="confirm-text">Tem certeza que deseja <strong>excluir este fiado</strong>? Esta ação não pode ser desfeita.</p>
                <div className="confirm-buttons">
                  <button className="btn-action delete-confirm" onClick={handleDeleteDebt} disabled={processing}>
                    <Trash2 size={18} />
                    {processing ? 'Excluindo...' : 'Sim, Excluir'}
                  </button>
                  <button className="btn-action cancel" onClick={() => setConfirmAction(null)} disabled={processing}>
                    <XCircle size={18} />
                    Não, Voltar
                  </button>
                </div>
              </div>
            ) : (
              <div className="action-buttons-group">
                {isPaid ? (
                  <button className="btn-action-main undo-btn" onClick={() => setConfirmAction('undo')}>
                    <Undo2 size={20} />
                    Desfazer Pagamento
                  </button>
                ) : (
                  <button className="btn-action-main pay-btn" onClick={() => setConfirmAction('pay')}>
                    <CheckCircle size={20} />
                    Confirmar Pagamento
                  </button>
                )}
                <button className="btn-action-main delete-btn" onClick={() => setConfirmAction('delete')}>
                  <Trash2 size={20} />
                  Excluir Fiado
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .debt-detail-view { padding: 20px; max-width: 700px; margin: 0 auto; }
        
        .debt-detail-content { display: flex; flex-direction: column; gap: 20px; }

        .status-banner {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px 20px;
          border-radius: 16px;
          font-weight: 700;
        }
        .status-banner.paid { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
        .status-banner.overdue { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
        .status-banner.pending { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
        .status-text { display: flex; flex-direction: column; gap: 2px; }
        .status-title { font-size: 1rem; font-weight: 800; }
        .status-sub { font-size: 0.8rem; font-weight: 600; opacity: 0.8; }

        .invoice-header {
          background: white;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .invoice-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .invoice-label { font-size: 0.8rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
        .invoice-value { font-weight: 800; color: var(--text-main); }
        .invoice-value.highlight { color: var(--primary); background: #eef2ff; padding: 2px 10px; border-radius: 8px; }
        .invoice-value.text-red { color: #ef4444; }

        .invoice-items-section {
          background: white;
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
        }
        .items-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 0.95rem;
          font-weight: 800;
          color: var(--text-main);
          padding: 16px 20px;
          border-bottom: 1px solid var(--border);
          background: #f8fafc;
          margin: 0;
        }
        .no-items {
          padding: 24px;
          text-align: center;
          color: var(--text-muted);
          font-weight: 600;
        }

        .items-table { display: flex; flex-direction: column; }
        .items-header {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          padding: 10px 20px;
          background: #f1f5f9;
          font-size: 0.7rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .item-row {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          padding: 12px 20px;
          border-bottom: 1px solid #f1f5f9;
          font-size: 0.85rem;
          align-items: center;
        }
        .item-row:last-child { border-bottom: none; }
        .col-name { font-weight: 700; color: var(--text-main); }
        .col-qty { font-weight: 600; color: var(--text-muted); text-align: center; }
        .col-price { font-weight: 600; color: var(--text-muted); text-align: right; }
        .col-subtotal { font-weight: 800; color: var(--text-main); text-align: right; }

        .invoice-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-top: 2px solid var(--border);
          background: #f8fafc;
        }
        .invoice-total span:first-child {
          font-size: 0.85rem;
          font-weight: 800;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .total-value {
          font-size: 1.5rem;
          font-weight: 900;
          color: var(--primary);
        }

        .detail-actions {
          margin-top: 8px;
        }

        .btn-action-main {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 18px;
          border-radius: 16px;
          font-size: 1.1rem;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action-main.pay-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          box-shadow: 0 10px 20px -5px rgba(16, 185, 129, 0.4);
        }
        .btn-action-main.pay-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -5px rgba(16, 185, 129, 0.5); }
        
        .btn-action-main.undo-btn {
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: white;
          box-shadow: 0 10px 20px -5px rgba(245, 158, 11, 0.4);
        }
        .btn-action-main.undo-btn:hover { transform: translateY(-2px); box-shadow: 0 14px 28px -5px rgba(245, 158, 11, 0.5); }

        .btn-action-main.delete-btn {
          background: transparent;
          color: #ef4444;
          border: 2px solid #fecaca;
          box-shadow: none;
          font-size: 0.95rem;
          padding: 14px;
        }
        .btn-action-main.delete-btn:hover { background: #fef2f2; border-color: #ef4444; transform: translateY(-2px); }

        .action-buttons-group { display: flex; flex-direction: column; gap: 12px; }

        .confirm-dialog {
          background: white;
          border: 2px solid #10b981;
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: fadeIn 0.3s ease;
        }
        .confirm-dialog.undo { border-color: #f59e0b; }
        .confirm-dialog.delete { border-color: #ef4444; }
        .confirm-text { 
          font-size: 0.95rem; 
          font-weight: 600; 
          color: var(--text-main); 
          text-align: center;
          margin: 0;
          line-height: 1.5;
        }
        .confirm-buttons { display: flex; gap: 12px; }
        .btn-action {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px;
          border-radius: 12px;
          font-size: 0.9rem;
          font-weight: 800;
          border: none;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-action.confirm { background: #10b981; color: white; }
        .btn-action.confirm:hover { background: #059669; }
        .btn-action.undo-confirm { background: #f59e0b; color: white; }
        .btn-action.undo-confirm:hover { background: #d97706; }
        .btn-action.cancel { background: #f1f5f9; color: var(--text-muted); }
        .btn-action.cancel:hover { background: #e2e8f0; }
        .btn-action.delete-confirm { background: #ef4444; color: white; }
        .btn-action.delete-confirm:hover { background: #dc2626; }
        .btn-action:disabled { opacity: 0.6; cursor: not-allowed; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }

        @media (max-width: 768px) {
          .items-header { grid-template-columns: 2fr 1fr 1fr; }
          .item-row { grid-template-columns: 2fr 1fr 1fr; }
          .col-price { display: none; }
          .items-header .col-price { display: none; }
          .confirm-buttons { flex-direction: column; }
        }
      `}</style>
    </div>
  );
};

export default DebtDetailView;
