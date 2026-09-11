let activeDialog = null;

function ensureStyles() {
  if (document.getElementById("fazajoo-insite-dialog-styles")) return;
  const style = document.createElement("style");
  style.id = "fazajoo-insite-dialog-styles";
  style.textContent = `
    .fazajoo-dialog-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(31,29,26,.48);display:flex;align-items:center;justify-content:center;padding:20px;direction:rtl}
    .fazajoo-dialog{width:min(460px,100%);background:#fffdf9;border:1px solid rgba(183,106,32,.22);border-radius:20px;box-shadow:0 24px 70px rgba(0,0,0,.22);padding:24px;font-family:Estedad, Tahoma, sans-serif;text-align:right}
    .fazajoo-dialog-icon{width:48px;height:48px;border-radius:15px;display:flex;align-items:center;justify-content:center;background:#fff1df;color:#a85f1b;font-size:24px;margin-bottom:14px}
    .fazajoo-dialog-title{font-size:18px;font-weight:800;color:#302b27;margin-bottom:9px}
    .fazajoo-dialog-message{font-size:14px;line-height:1.9;color:#625b54;white-space:pre-wrap}
    .fazajoo-dialog-actions{display:flex;gap:10px;justify-content:flex-start;margin-top:22px}
    .fazajoo-dialog-btn{border:0;border-radius:12px;padding:10px 18px;font:inherit;font-weight:700;cursor:pointer}
    .fazajoo-dialog-cancel{background:#eee9e3;color:#514a44}
    .fazajoo-dialog-confirm{background:#c8792d;color:#fff}
    .fazajoo-dialog-confirm:hover{background:#ae641f}
  `;
  document.head.appendChild(style);
}

function closeDialog(value) {
  if (!activeDialog) return;
  const { backdrop, resolve } = activeDialog;
  activeDialog = null;
  backdrop.remove();
  resolve(value);
}

function showDialog({title, message, confirm=false}) {
  if (activeDialog) closeDialog(false);
  ensureStyles();
  return new Promise((resolve) => {
    const backdrop=document.createElement("div");
    backdrop.className="fazajoo-dialog-backdrop";
    const box=document.createElement("div");
    box.className="fazajoo-dialog";
    box.setAttribute("role","dialog");
    box.setAttribute("aria-modal","true");
    box.innerHTML=`
      <div class="fazajoo-dialog-icon">${confirm ? "⚠️" : "✓"}</div>
      <div class="fazajoo-dialog-title">${escapeHtml(title || "فضاجو")}</div>
      <div class="fazajoo-dialog-message">${escapeHtml(message || "")}</div>
      <div class="fazajoo-dialog-actions">
        ${confirm ? '<button type="button" class="fazajoo-dialog-btn fazajoo-dialog-cancel">انصراف</button>' : ""}
        <button type="button" class="fazajoo-dialog-btn fazajoo-dialog-confirm">${confirm ? "تأیید" : "متوجه شدم"}</button>
      </div>`;
    backdrop.appendChild(box);
    document.body.appendChild(backdrop);
    activeDialog={backdrop,resolve};
    const confirmBtn=box.querySelector(".fazajoo-dialog-confirm");
    const cancelBtn=box.querySelector(".fazajoo-dialog-cancel");
    confirmBtn.addEventListener("click",()=>closeDialog(true));
    cancelBtn?.addEventListener("click",()=>closeDialog(false));
    backdrop.addEventListener("click",(e)=>{if(e.target===backdrop) closeDialog(false)});
    const onKey=(e)=>{if(e.key==="Escape"){closeDialog(false);document.removeEventListener("keydown",onKey)}};
    document.addEventListener("keydown",onKey);
    confirmBtn.focus();
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;")
    .replaceAll('"',"&quot;").replaceAll("'","&#039;");
}

export function showInSiteAlert(message, title="پیام فضاجو") {
  return showDialog({title,message,confirm:false});
}

export function showInSiteConfirm(message, title="تأیید عملیات") {
  return showDialog({title,message,confirm:true});
}
