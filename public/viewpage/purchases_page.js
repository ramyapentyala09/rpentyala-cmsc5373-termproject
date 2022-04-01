import * as Util from './util.js'
import { MENU, root } from "./elements.js";
import { ROUTE_PATHNAMES } from "../controller/route.js";
import { currentUser } from '../controller/firebase_auth.js';
import { getPurchaseHistory } from '../controller/firestore_controller.js';
import { DEV } from '../model/constants.js';
import { cart } from './cart_page.js';
import { modalTransaction } from "./elements.js";


export function addEventListeners() {
    MENU.Purchases.addEventListener('click', async () => {
        history.pushState(null, null, ROUTE_PATHNAMES.PURCHASES);
        const label = Util.disableButton(MENU.Purchases);
        await purchases_page();
        Util.enableButton(MENU.Purchases, label);
    });
}

export async function purchases_page() {
    if (!currentUser) {
        root.innerHTML = '<h1> Purchase History</h1>'
        return;
    }

    let html = '<h1> Purchase History</h1>'

    let carts;

    try {
        carts = await getPurchaseHistory(currentUser.uid);
        if (carts.length == 0) {
            html += '<h3> No Purchase history found!</h3>'
            root.innerHTML = html;
            return;
        }
    } catch (e) {
        if (DEV) console.log(e);
        Util.info('Error in getPurchaseHistory', JSON.stringify(e));
        root.innerHTML = '<h1>Failed to get purchase history</h1>';
        return;
    }

    html += `
    <table class="table">
    <thead>
        <tr>
        <th scope="col">View</th>
        <th scope="col">Items</th>
        <th scope="col">Price</th>
        <th scope="col">Date</th>
    </tr>
    </thead>
    <tbody>
    `;

    for (let i = 0; i < carts.length; i++) {
        html += `
        <tr>
            <td>
               <form method="post" class="form-purchase-details">
                   <input type="hidden" name="index" value="${i}">
                   <button type="submit" class="btn btn-outline-primary">Details</button>
               </form>
            </td>
            <td>${carts[i].getTotalQty()}</td>
            <td>${Util.currency(carts[i].getTotalPrice())}</td>
            <td>${new Date(carts[i].timestamp).toString()}</td>
        </tr>
     `;
    }

    html += '<tbody></table>';

    root.innerHTML = html;

    const detailsForm = document.getElementsByClassName('form-purchase-details');
    for (let i = 0; i < detailsForm.length; i++) {
        detailsForm[i].addEventListener('submit', e => {
            e.preventDefault();
            const index = e.target.index.value;
            modalTransaction.title.innerHTML = `Purchased At: ${new Date(carts[index].timestamp).toString()}`;
            modalTransaction.body.innerHTML = buildTransactionView(carts[index]);
            modalTransaction.modal.show();


        })
    }

}

function buildTransactionView(cart) {
    let html = `
    <table class="table">
    <thead>
        <tr>
        <th scope="col">Image</th>
        <th scope="col">Name</th>
        <th scope="col">Price</th>
        <th scope="col">Qty</th>
        <th scope="col">Sub-total</th>
        <th scope="col" width="50%">Summary</th>
        </tr>
    </thead>
    <tbody>
    `;
    cart.items.forEach(p => {
        html += `
           <tr>
               <td><img src="${p.imageURL}"></td>
               <td>${p.name}</td>
               <td>${Util.currency(p.price)}</td>
               <td>${p.qty}</td>
               <td>${Util.currency(p.price * p.qty)}</td>
               <td>${p.summary}</td>
           </tr>
            `;

    });
    html += '</tbody></table>'
    html += `
        <div class="fs-3">Total: ${Util.currency(cart.getTotalPrice())}</div>
    `;
    return html;
}