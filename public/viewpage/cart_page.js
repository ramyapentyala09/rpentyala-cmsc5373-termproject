import { MENU, root } from "./elements.js";
import { ROUTE_PATHNAMES } from "../controller/route.js";
import { ShoppingCart } from "../model/shopping_cart.js";
import { currentUser } from "../controller/firebase_auth.js";
import { currency, disableButton, enableButton, info } from "./util.js";
import { home_page } from "./home_page.js";
import { DEV } from "../model/constants.js";
import { checkout } from "../controller/firestore_controller.js";
export function addEventListeners() {
    MENU.Cart.addEventListener('click', async () => {
        history.pushState(null, null, ROUTE_PATHNAMES.CART);
        await cart_page();
    });
}
export let cart;

export async function cart_page() {
    if (!currentUser) {
        root.innerHTML = '<h1>Protected Page</h1>'
        return;
    }
    let html = '<h1>Shopping Cart</h1>'
    if (!cart || cart.getTotalQty() == 0) {
        html += '<h3>Empty! Buy More!</h3>';
        root.innerHTML = html;
        return;
    }

    html = `
    <table class="table">
    <thead>
      <tr>
      <th scope="col">Image</th>
      <th scope="col">Name</th>
      <th scope="col">Unit Price</th>
      <th scope="col">Quantity</th>
      <th scope="col">Sub-Total</th>
      <th scope="col" width="50%">Summary</th>
      <th scope="col"></th>
      </tr>
    </thead>
    <tbody>
    `;
    cart.items.forEach((item, index) => {
        html += `
        <tr>
            <td><img src="${item.imageURL}" width="150px"></td>
            <td>${item.name}</td>
            <td>${currency(item.price)}</td>
            <td>
                <form method="post" class="form-product-qty-cont" style="display: flex; align-items: center;">
                    <input type="hidden" name="index" value="${index}">
                    <button class="btn btn-sm btn-outline-danger" type="submit" onclick="this.form.submitter='DEC'">&minus;</button>
                    <div id="item-count-cont-${item.docId}" class="text-center w-50 p-2">${item.qty}</div>
                    <button class="btn btn-sm btn-outline-danger" type="submit" onclick="this.form.submitter='INC'">&plus;</button>
                </form>
            </td>
            <td>${currency(item.price * item.qty)}</td>
            <td>${item.summary}</td>
            <td><button class="btn btn-sm btn-danger prodRemove" value="${index}"><i class="fa fa-trash"></i></button></td>
        </tr>

        `;
    });
    html += '</tbody></table>';
    html += `
        <div class="fs-3">TOTAL: ${currency(cart.getTotalPrice())}</div>
    `;
    html += `
    <button id="button-checkout" class="btn btn-outline-primary">Check Out</button>
    <button id="button-continue-shopping" class="btn btn-outline-secondary">Continue Shopping</button>
    `;
    root.innerHTML = html;
    const continueButton = document.getElementById('button-continue-shopping')
    continueButton.addEventListener('click', async () => {
        history.pushState(null, null, ROUTE_PATHNAMES.HOME);
        const label = disableButton(continueButton);
        await home_page();
        enableButton(continueButton, label);
    })
    const checkoutButton = document.getElementById('button-checkout');
    checkoutButton.addEventListener('click', async () => {
        const label = disableButton(checkoutButton);
        try {
            // charging is done! ==> for students in term project
            // save to Firebase (await)
            await checkout(cart);
            info('Success!', 'Checkout Complete!');
            cart.clear();
            MENU.CartItemCount.innerHTML = 0;
            history.pushState(null, null, ROUTE_PATHNAMES.HOME);
            await home_page();

        } catch (e) {
            if (DEV) console.log(e);
            info('Checkout Failed', JSON.stringify(e));
        }
        enableButton(checkoutButton, label);
    });

    const prodForms = document.getElementsByClassName('form-product-qty-cont');
    for (let i = 0; i < prodForms.length; i++) {
        prodForms[i].addEventListener('submit', async e => {
            e.preventDefault();
            const p = cart.items[e.target.index.value];
            const submitter = e.target.submitter;
            if (submitter == 'DEC') {
                if (p.qty == 1) return;
                cart.removeItem(p);
            } else if (submitter == 'INC') {
                cart.addItem(p);
            } else {
                if (DEV) console.log(e);
                return;
            }

            document.getElementById(`item-count-cont-${p.docId}`).innerHTML = p.qty;
            MENU.CartItemCount.innerHTML = `${cart.getTotalQty()}`;
            await cart_page();
        });
    }

    const prodRemovals = document.getElementsByClassName('prodRemove');
    for (let i = 0; i < prodRemovals.length; i++) {
        prodRemovals[i].addEventListener('click', async e => {
            const willDelete = await swal({
                title: "Are you sure?",
                text: "Do you want to remove product from cart!",
                icon: "warning",
                buttons: ["No", "Yes"],
                dangerMode: true,
            })
            if (willDelete) {
                const p = cart.items[e.target.parentNode.value || e.target.value];
                cart.removeItem(p, true);

                MENU.CartItemCount.innerHTML = `${cart.getTotalQty()}`;
                await cart_page();
                swal("Success!", "Product deleted successfully!", "success");
            }
        });
    }
}
export function initShoppingCart() {
    cart = new ShoppingCart(currentUser.uid);
    MENU.CartItemCount.innerHTML = 0;
}