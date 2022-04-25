import * as Util from './util.js'
import { MENU, root } from "./elements.js";
import { ROUTE_PATHNAMES } from "../controller/route.js";
import { getProductList, getPurchaseHistory, addReview, getReviews, deleteReview, updateReview } from "../controller/firestore_controller.js";
import { DEV } from "../model/constants.js";
import { currentUser } from "../controller/firebase_auth.js";
import { cart } from "./cart_page.js";

let currentProductDetail;
let editCommentDocId;

let loader = `<div style="text-align: center">
<div class="spinner-border" style="width: 3rem; height: 3rem;" role="status">
</div>
</div>`

export function addEventListeners() {
    MENU.Home.addEventListener('click', async () => {
        history.pushState(null, null, ROUTE_PATHNAMES.HOME);
        const label = Util.disableButton(MENU.Home);
        await home_page();
        Util.enableButton(MENU.Home, label);
    });

    document.getElementById("form-create-review").addEventListener("submit", async e => {
        e.preventDefault();
        let productId = currentProductDetail.split("-")[0]
        let productName = currentProductDetail.split("-")[1]
        let purchaseHist = await getPurchaseHistory(currentUser.uid)
        let products = [].concat.apply([], purchaseHist.map(pur => pur.items))
        if (products.find(prod => prod.name === productName)) {
            let formData = new FormData(e.target)
            let ratingsEle = document.querySelectorAll("#ratings-container-1 .checked")
            if (!ratingsEle.length) return swal("Wait!", "Please give a rating", "warning");
            await addReview({
                comment: formData.get('content'),
                rating: ratingsEle.length,
                email: currentUser.email,
                pid: productId,
                timestamp: Date.now()
            })
            e.target.reset()
            Array.from(ratingsEle).map(ele => ele.className = "fa fa-star")
            document.querySelector("#modal-create-review .btn-close").click()
            swal("Success!", "Review added successfully!", "success");
            await home_page()
        } else {
            swal("Wait!", "You have'nt purchase this item yet!", "warning");
        }
    })

    document.getElementById("form-edit-review").addEventListener("submit", async e => {
        e.preventDefault();
        let formData = new FormData(e.target)
        let ratingsEle = document.querySelectorAll("#ratings-container-2 .checked")
        if (!ratingsEle.length) return swal("Wait!", "Please give a rating", "warning");
        await updateReview(editCommentDocId, {
            comment: formData.get('content'),
            rating: ratingsEle.length,
            timestamp: Date.now()
        })
        e.target.reset()
        Array.from(ratingsEle).map(ele => ele.className = "fa fa-star")
        document.querySelector("#modal-edit-review .btn-close").click()
        swal("Success!", "Review updated successfully!", "success");
        await home_page()
    })

    document.getElementById('searchBtn').addEventListener('click', getProductBySearching)
    document.getElementById('priceBox').addEventListener('change', getProductByPricing)
    document.getElementById('priceRange').addEventListener('change', getProductByPricingRange)
}

async function renderComments(productDet) {
    let comments = await getReviews()
    document.getElementById("comments-section").innerHTML = '';
    let filteredComments = comments.filter(comment => productDet.split("-")[0] === comment.pid);
    if (!!filteredComments.length) {
        filteredComments.map((comment, index) => {
            document.getElementById("comments-section").innerHTML += `<div>
                <div class="border border-primary">
                  <input type="hidden" name="commentId" value="${comment.docId}">
                  <div class="bg-info text-white d-flex justify-content-between" style="padding: 0 10px;">
                    <p style="margin: 0">${comment.email}</p>
                    <p style="margin: 0">${new Date(comment.timestamp).toLocaleString()}</p>
                  </div>
                  <div class="d-flex align-items-center justify-content-between p-2">
                    <p style="margin: 0;">${comment.comment}</p>
                    ${comment.email === currentUser?.email ? `<button style="height: fit-content;" class="btn btn-primary editReview" data-bs-toggle="modal" data-bs-target="#modal-edit-review" value="${comment.docId}">
                      Edit</button>` : ''}
                    ${comment.email === currentUser?.email ? `<button style="height: fit-content;" class="btn btn-danger delReview" value="${comment.docId}">
                      Delete</button>` : ''}
                  </div>
                </div>
                <div style="padding-top: 10px;">
                  <span class="fa fa-star ${comment.rating >= 1 ? "checked" : ""}"></span>
                  <span class="fa fa-star ${comment.rating >= 2 ? "checked" : ""}"></span>
                  <span class="fa fa-star ${comment.rating >= 3 ? "checked" : ""}"></span>
                  <span class="fa fa-star ${comment.rating >= 4 ? "checked" : ""}"></span>
                  <span class="fa fa-star ${comment.rating == 5 ? "checked" : ""}"></span>
                </div>
                <hr>
              </div>`
            if (filteredComments.length === 1 + index) {
                Array.from(document.querySelectorAll(".delReview")).map(delBtn => {
                    delBtn.addEventListener("click", async e => {
                        await deleteReview(e.target.value)
                        swal("Success!", "Review deleted successfully!", "success");
                        await home_page()
                        await renderComments(productDet);
                    })
                })
                Array.from(document.querySelectorAll(".editReview")).map(editBtn => {
                    editBtn.addEventListener("click", async e => {
                        editCommentDocId = e.target.value
                    })
                })
            }
        })
    } else {
        document.getElementById("comments-section").innerHTML = `<div style="margin-bottom: 20px;">No Reviews Yet!</div>`;
    }
}
export async function home_page() {
    let html = '<h1>Enjoy Shopping!</h1>'
    let products;
    try {
        products = await getProductList();
        if (cart && cart.getTotalQty() != 0) {
            cart.items.forEach(item => {
                const p = products.find(e => e.docId == item.docId);
                if (p) p.qty = item.qty;
            });
        }
    } catch (e) {
        Util.info('Failed to get the product list', JSON.stringify(e));
    }

    for (let i = 0; i < products.length; i++) {
        html += buildProductView(products[i], i);
    }
    root.innerHTML = html;

    document.getElementById('productView').style.display = 'flex'

    const reviewModalBtn = document.getElementsByClassName('review-modal-btn');
    for (let i = 0; i < reviewModalBtn.length; i++) {
        reviewModalBtn[i].onclick = async e => {
            let productDet = e.target.value
            currentProductDetail = productDet
            await renderComments(productDet);
        };
    }


    const productForms = document.getElementsByClassName('form-product-qty');
    for (let i = 0; i < productForms.length; i++) {
        productForms[i].addEventListener('submit', e => {
            e.preventDefault();
            const p = products[e.target.index.value];
            const submitter = e.target.submitter;
            if (submitter == 'DEC') {
                cart.removeItem(p);
                if (p.qty > 0) --p.qty;
            } else if (submitter == 'INC') {
                cart.addItem(p);
                p.qty = p.qty == null ? 1 : p.qty + 1;
            } else {
                if (DEV) console.log(e);
                return;
            }

            const updateQty = (p.qty == null || p.qty == 0) ? 'Add' : p.qty;
            document.getElementById(`item-count-${p.docId}`).innerHTML = updateQty;
            MENU.CartItemCount.innerHTML = `${cart.getTotalQty()}`;
        });
    }

}

async function getProductBySearching() {
    let html = '<h1>Enjoy Shopping!</h1>'
    root.innerHTML = loader
    let text = document.getElementById('searchBox').value

    let products;

    try {
        products = await getProductList();
        if (!!text) {
            products = products.filter(product => product.name.toLowerCase().startsWith(text.toLowerCase()) || product.summary.toLowerCase().startsWith(text.toLowerCase()));
        }
    } catch (e) {
        if (Constants.DEV) console.log(e);
        Util.info('Cannot get product List by searching', JSON.stringify(e));

        return;

    }
    root.innerHTML = ''

    products.forEach((p, ind) => {
        html += buildProductView(p, ind);
    });

    document.getElementById('priceRange').disabled = !!text
    document.getElementById('priceBox').disabled = !!text

    if (!products.length) {
        root.innerHTML = '<h2>No Products</h2>'
    } else {
        root.innerHTML = html
    }
}

async function getProductByPricing() {
    let html = '<h1>Enjoy Shopping!</h1>'
    root.innerHTML = loader
    let priceVal = document.getElementById('priceBox').value

    let products;

    try {
        products = await getProductList();
        if (!isNaN(priceVal)) {
            products = products.sort((prodA, prodB) => prodA.price - prodB.price)
            if (priceVal != 1) {
                products = products.reverse()
            }
        }
    } catch (e) {
        Util.info('Cannot get product List by pricing', JSON.stringify(e));

        return;

    }
    root.innerHTML = ''

    products.forEach((p, ind) => {
        html += buildProductView(p, ind);
    });

    document.getElementById('searchBox').value = ''
    document.getElementById('priceRange').disabled = !isNaN(priceVal)

    if (!products.length) {
        root.innerHTML = '<h2>No Products</h2>'
    } else {
        root.innerHTML = html
    }
}

async function getProductByPricingRange() {
    let html = '<h1>Enjoy Shopping!</h1>'
    root.innerHTML = loader
    let priceRangeVal = document.getElementById('priceRange').value

    let products;

    try {
        products = await getProductList();
        if (!isNaN(priceRangeVal)) {
            if (priceRangeVal == 1) {
                products = products.filter(product => product.price <= 10)
            } else if (priceRangeVal == 2) {
                products = products.filter(product => product.price >= 10 && product.price <= 20)
            } else if (priceRangeVal == 3) {
                products = products.filter(product => product.price >= 20 && product.price <= 50)
            } else if (priceRangeVal == 4) {
                products = products.filter(product => product.price >= 50 && product.price <= 100)
            } else if (priceRangeVal == 5) {
                products = products.filter(product => product.price >= 100)
            }
        }
    } catch (e) {
        Util.info('Cannot get product List by pricing range', JSON.stringify(e));

        return;

    }
    root.innerHTML = ''

    products.forEach((p, ind) => {
        html += buildProductView(p, ind);
    });

    document.getElementById('searchBox').value = ''
    document.getElementById('priceBox').disabled = !isNaN(priceRangeVal)

    if (!products.length) {
        root.innerHTML = '<h2>No Products</h2>'
    } else {
        root.innerHTML = html
    }
}

function buildProductView(product, index) {
    return `
    <div class="card" style="width: 18rem; display: inline-block;">
        <img src="${product.imageURL}" class="card-img-top">
        <div class="card-body">
             <h5 class="card-title">${product.name}</h5>
             <p class="card-text">
                ${Util.currency(product.price)}<br>
                ${product.summary}
             </p>
             <div style="padding: 10px 0;">
              ${[1, 2, 3, 4, 5].map(resNum => resNum <= product.avgRating ? '<span class="fa fa-star checked"></span>' : '<span class="fa fa-star"></span>').join(" ").concat(`<span style="margin-left: 10px; font-size: x-large; font-weight: bold;">${product.avgRating}</span>`)}
            </div>
            <button value="${product.docId}-${product.name}" class="btn btn-info review-modal-btn" data-bs-toggle="modal" data-bs-target="#modal-create-review">Reviews</button>
        <div class="container pt-3 bg-light ${currentUser ? 'd-block' : 'd-none'}">
            <form method="post" class="form-product-qty">
                <input type="hidden" name="index" value="${index}">
                <button class="btn btn-outline-danger" type="submit"
                    onclick="this.form.submitter='DEC'">&minus;</button>
                <div id="item-count-${product.docId}"
                class="container rounded text-center text-white bg-primary d-inline-block w-50">
                    ${product.qty == null || product.qty == 0 ? 'Add' : product.qty}
                </div>
                <button class="btn btn-outline-danger" type="submit"
                    onclick="this.form.submitter='INC'">&plus;</button>
            </form>
        </div>
  </div>
</div>
    `;
}