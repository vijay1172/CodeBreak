import { useEffect, useState } from 'react';
import { call } from './api.js';
import { dollars } from './format.js';
import { AccountPicker } from './components/AccountPicker.jsx';
import { OrderForm } from './components/OrderForm.jsx';
import { OrderList } from './components/OrderList.jsx';
import { ReturnForm } from './components/ReturnForm.jsx';
import { ReturnHistory } from './components/ReturnHistory.jsx';

export function App() {
  const [account, setAccount] = useState('lena');
  const [token, setToken] = useState('');
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [balance, setBalance] = useState(0);
  const [item, setItem] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState('');
  const [notice, setNotice] = useState('');

  async function refresh(value = token) {
    if (!value) return;
    try {
      const [ordersResponse, returnsResponse, creditsResponse] = await Promise.all([
        call(value, '/orders'), call(value, '/returns'), call(value, '/credits'),
      ]);
      setOrders(ordersResponse.orders); setReturns(returnsResponse.returns); setBalance(creditsResponse.balanceCents);
    } catch (error) { setNotice(error.message); }
  }
  useEffect(() => {
    let active = true;
    setToken(''); setOrders([]); setReturns([]); setBalance(0); setSelected(''); setNotice('');
    call('', '/demo/session', 'POST', { accountId: account }).then(async (session) => {
      if (!active) return;
      setToken(session.token);
      await refresh(session.token);
    }).catch((error) => { if (active) setNotice(error.message); });
    return () => { active = false; };
  }, [account]);

  async function create(event) {
    event.preventDefault();
    try {
      const result = await call(token, '/orders', 'POST', { item, amountCents: Math.round(Number(amount) * 100) });
      setSelected(result.order.id); setItem(''); setAmount(''); setNotice('Order placed.');
      await refresh();
    } catch (error) { setNotice(error.message); }
  }
  async function submitReturn(event) {
    event.preventDefault();
    if (!selected) return;
    try {
      const result = await call(token, '/orders/' + selected + '/returns', 'POST', { reason });
      setReason(''); setNotice('Return credited: ' + dollars(result.return.amountCents));
    } catch (error) { setNotice(error.message); }
    await refresh();
  }
  return <main className="shell"><header><div><p className="eyebrow">SECOND CHANCE / DEMO STORE</p><h1>Returns that add up.</h1><p>Place sample orders and compare return history with your store-credit balance.</p></div><AccountPicker account={account} onChange={setAccount}/></header>
    {notice && <p className="notice" role="status">{notice}</p>}
    <div className="summary"><strong>Store credit: {dollars(balance)}</strong><span>Limit: $50.00</span><button type="button" onClick={() => refresh()} disabled={!token}>Refresh account</button></div>
    <div className="grid"><OrderForm item={item} setItem={setItem} amount={amount} setAmount={setAmount} create={create} disabled={!token}/>
      <section className="panel"><OrderList orders={orders} selected={selected} setSelected={setSelected}/><ReturnForm reason={reason} setReason={setReason} submitReturn={submitReturn} disabled={!token || !selected}/></section>
      <ReturnHistory returns={returns}/>
    </div>
  </main>;
}
