import os

BASE = r'c:\Users\nouri\Desktop\Client\RAWAQA'

# ============ APPEND REMAINING CSS ============
css_rest = """
/* AUTH PAGES */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:6rem var(--edge);background:var(--ivory);}
.auth-card{background:var(--white);border-radius:var(--r-xl);padding:3rem;width:100%;max-width:440px;box-shadow:var(--shadow-md);}
.auth-logo{display:flex;align-items:center;justify-content:center;gap:.7rem;margin-bottom:2.5rem;}
.auth-logo svg{width:32px;height:32px;}
.auth-logo-text{font-family:var(--serif);font-size:1.2rem;letter-spacing:.16em;}
.auth-title{font-family:var(--serif);font-size:1.8rem;text-align:center;margin-bottom:.5rem;}
.auth-sub{font-size:.86rem;color:var(--ink-soft);text-align:center;margin-bottom:2rem;}
.auth-switch{text-align:center;font-size:.84rem;color:var(--ink-soft);margin-top:1.5rem;}
.auth-switch a{color:var(--gold);cursor:pointer;font-weight:600;}

/* ACCOUNT */
.account-wrap{padding:9rem var(--edge) 6rem;max-width:var(--container);margin:0 auto;}
.account-grid{display:grid;grid-template-columns:240px 1fr;gap:3rem;}
.account-nav{align-self:start;position:sticky;top:110px;}
.account-nav-item{display:flex;align-items:center;gap:.8rem;padding:.85rem 1rem;border-radius:var(--r-md);font-size:.86rem;cursor:pointer;transition:all var(--dur);color:var(--ink-soft);}
.account-nav-item:hover,.account-nav-item.active{background:var(--sand);color:var(--ink);}
.account-nav-item.active{font-weight:700;}
.order-card{background:var(--white);border:1px solid rgba(30,28,22,.09);border-radius:var(--r-lg);padding:1.8rem;margin-bottom:1.2rem;box-shadow:var(--shadow-sm);}
.order-card-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1.2rem;flex-wrap:wrap;gap:.8rem;}
.order-number{font-family:var(--serif);font-size:1.1rem;}
.order-status{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;padding:.35rem .85rem;border-radius:var(--r-pill);}
.status-pending{background:rgba(190,143,46,.15);color:var(--ochre);}
.status-confirmed,.status-processing{background:rgba(59,85,120,.15);color:var(--indigo);}
.status-shipped{background:rgba(184,146,79,.15);color:var(--gold);}
.status-delivered{background:rgba(75,91,69,.2);color:var(--forest);}
.status-cancelled{background:rgba(168,84,58,.15);color:var(--clay);}
@media(max-width:900px){.account-grid{grid-template-columns:1fr;}.account-nav{position:static;display:flex;gap:.5rem;overflow-x:auto;}}

/* CONFIRMATION */
.confirm-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:6rem var(--edge);background:var(--ivory);}
.confirm-card{background:var(--white);border-radius:var(--r-xl);padding:3.5rem;max-width:560px;width:100%;text-align:center;box-shadow:var(--shadow-md);}
.confirm-icon{width:72px;height:72px;background:rgba(75,91,69,.12);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1.8rem;}
.confirm-order-num{font-family:var(--serif);font-size:2rem;color:var(--gold);margin:1rem 0;}

/* TOAST */
.toast{position:fixed;bottom:2rem;left:50%;transform:translateX(-50%) translateY(20px);background:var(--charcoal);color:var(--ivory);padding:.9rem 1.8rem;border-radius:var(--r-pill);font-size:.82rem;opacity:0;pointer-events:none;transition:all var(--dur) var(--ease);z-index:500;border:1px solid rgba(212,168,90,.15);white-space:nowrap;box-shadow:var(--shadow-lg);}
.toast.show{opacity:1;transform:translateX(-50%) translateY(0);}
.toast.success{background:var(--forest);}
.toast.error{background:var(--clay);}

/* FOOTER */
footer{background:var(--charcoal);color:rgba(248,245,238,.65);padding:5rem var(--edge) 2.5rem;border-top:1px solid rgba(212,168,90,.1);}
.foot-grid{display:grid;grid-template-columns:1.4fr repeat(3,1fr);gap:3rem;padding-bottom:3.5rem;}
.foot-brand svg{width:40px;height:40px;margin-bottom:1.2rem;}
.foot-tagline{font-family:var(--serif);font-size:1.1rem;color:var(--ivory);max-width:22ch;line-height:1.5;}
.foot-col h4{font-size:.72rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-light);margin-bottom:1.2rem;}
.foot-col a{display:block;font-size:.84rem;padding:.35rem 0;color:rgba(248,245,238,.6);transition:color var(--dur);cursor:pointer;}
.foot-col a:hover{color:var(--gold-light);}
.foot-bottom{display:flex;justify-content:space-between;align-items:center;padding-top:2rem;border-top:1px solid rgba(212,168,90,.08);font-size:.74rem;color:rgba(248,245,238,.35);flex-wrap:wrap;gap:1rem;}
@media(max-width:900px){.foot-grid{grid-template-columns:1fr 1fr;}}
@media(max-width:480px){.foot-grid{grid-template-columns:1fr;}}

/* WHY SECTION */
.why-grid{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid rgba(30,28,22,.1);}
.why-item{padding:2.5rem 1.8rem 2.5rem 0;border-right:1px solid rgba(30,28,22,.1);}
.why-item:last-child{border-right:none;}
.why-icon{width:40px;height:40px;margin-bottom:1.3rem;color:var(--gold);}
.why-title{font-family:var(--serif);font-size:1.05rem;margin-bottom:.5rem;}
.why-text{font-size:.84rem;color:var(--ink-soft);line-height:1.6;}
@media(max-width:900px){.why-grid{grid-template-columns:1fr 1fr;}.why-item{border-right:1px solid rgba(30,28,22,.1);border-bottom:1px solid rgba(30,28,22,.1);padding:2rem 1.4rem;}}

/* REVIEWS */
.review-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1.6rem;}
.review-card{background:var(--white);border-radius:var(--r-lg);padding:2rem;border:1px solid rgba(30,28,22,.07);box-shadow:var(--shadow-sm);}
.review-stars{color:var(--gold);font-size:.9rem;letter-spacing:.1em;margin-bottom:1rem;}
.review-quote{font-size:.92rem;line-height:1.65;margin-bottom:1.4rem;}
.review-author{font-size:.78rem;font-weight:700;}
.review-loc{font-size:.74rem;color:var(--ink-soft);}
@media(max-width:900px){.review-grid{grid-template-columns:1fr;}}

/* MOMENT SECTION */
.moment{background:var(--charcoal);color:var(--ivory);overflow:hidden;}
.moment-grid{display:grid;grid-template-columns:1fr 1fr;min-height:85vh;}
.moment-art{background:linear-gradient(150deg,var(--charcoal-2),var(--charcoal));display:flex;align-items:center;justify-content:center;}
.moment-art svg{width:72%;max-width:400px;}
.moment-copy{padding:5rem var(--edge);display:flex;flex-direction:column;justify-content:center;}
.moment-copy .lede{color:rgba(248,245,238,.6);margin-top:1.6rem;}
@media(max-width:900px){.moment-grid{grid-template-columns:1fr;}.moment-art{min-height:50vh;}}

/* LIFE GRID */
.life-grid{display:grid;grid-template-columns:repeat(6,1fr);grid-template-rows:repeat(2,210px);gap:1rem;}
.life-item{position:relative;border-radius:var(--r-lg);overflow:hidden;display:flex;align-items:flex-end;padding:1.2rem;color:var(--ivory);}
.life-item svg{position:absolute;inset:0;width:100%;height:100%;}
.life-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 40%,rgba(10,9,7,.78));}
.life-label{position:relative;font-size:.8rem;font-weight:700;letter-spacing:.05em;}
.life-item.i1{grid-column:span 3;grid-row:span 2;}
.life-item.i2{grid-column:span 3;}
.life-item.i3,.life-item.i4,.life-item.i5{grid-column:span 2;}
@media(max-width:900px){.life-grid{grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(3,160px);}.life-item.i1{grid-column:span 2;grid-row:span 1;}.life-item.i2,.life-item.i3,.life-item.i4,.life-item.i5{grid-column:span 1;}}

/* FINAL CTA */
.final-cta{background:var(--charcoal);color:var(--ivory);text-align:center;padding:9rem var(--edge);position:relative;overflow:hidden;}
.final-cta::before{content:"";position:absolute;inset:0;background:radial-gradient(50% 60% at 50% 0%,rgba(184,146,79,.14),transparent 70%);}
.final-cta .display-1{position:relative;max-width:14ch;margin:0 auto;}
.final-cta .lede{position:relative;margin:1.5rem auto 2.6rem;text-align:center;color:rgba(248,245,238,.6);}
.final-cta .btn{position:relative;}

/* SPINNER */
.spinner{width:40px;height:40px;border:3px solid rgba(30,28,22,.1);border-top-color:var(--gold);border-radius:50%;animation:rotate .8s linear infinite;margin:3rem auto;}
@keyframes rotate{to{transform:rotate(360deg);}}

/* ADMIN */
.admin-layout{display:grid;grid-template-columns:260px 1fr;min-height:100vh;}
.admin-sidebar{background:var(--charcoal-2);color:var(--ivory);padding:2rem 0;position:sticky;top:0;height:100vh;overflow-y:auto;}
.admin-logo{padding:0 1.5rem 2rem;border-bottom:1px solid rgba(212,168,90,.1);}
.admin-nav-item{display:flex;align-items:center;gap:.8rem;padding:.85rem 1.5rem;font-size:.84rem;cursor:pointer;transition:all var(--dur);color:rgba(248,245,238,.65);}
.admin-nav-item:hover,.admin-nav-item.active{background:rgba(212,168,90,.08);color:var(--gold-light);}
.admin-nav-item.active{border-right:2px solid var(--gold-light);}
.admin-content{padding:2.5rem;background:var(--ivory);}
.admin-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;}
.stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1.2rem;margin-bottom:2.5rem;}
.stat-card{background:var(--white);border-radius:var(--r-lg);padding:1.6rem;border:1px solid rgba(30,28,22,.08);box-shadow:var(--shadow-sm);}
.stat-label{font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:.6rem;}
.stat-value{font-family:var(--serif);font-size:2rem;font-weight:400;}
.stat-sub{font-size:.76rem;color:var(--ink-muted);margin-top:.3rem;}
.data-table{width:100%;border-collapse:collapse;background:var(--white);border-radius:var(--r-lg);overflow:hidden;box-shadow:var(--shadow-sm);}
.data-table th{font-size:.72rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--ink-soft);padding:1rem 1.2rem;text-align:left;border-bottom:1px solid rgba(30,28,22,.08);background:var(--ivory-2);}
.data-table td{padding:1rem 1.2rem;font-size:.86rem;border-bottom:1px solid rgba(30,28,22,.06);}
.data-table tr:last-child td{border-bottom:none;}
.data-table tr:hover td{background:var(--ivory);}
@media(max-width:900px){.admin-layout{grid-template-columns:1fr;}.admin-sidebar{position:static;height:auto;}.stat-grid{grid-template-columns:repeat(2,1fr);}}

/* UTILS */
.text-center{text-align:center;}
.hidden{display:none !important;}
.fade-in{animation:fadeUp .4s var(--ease) both;}
@keyframes fadeUp{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
"""

with open(os.path.join(BASE, 'css', 'styles.css'), 'a', encoding='utf-8') as f:
    f.write(css_rest)

print('CSS complete:', len(open(os.path.join(BASE,'css','styles.css'),encoding='utf-8').read()), 'chars')
