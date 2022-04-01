import {
    getFirestore,
    query,
    collection,
    orderBy,
    getDocs,
    getDoc,
    setDoc,
    addDoc,
    where,
    doc,
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/9.6.7/firebase-firestore.js"

import { COLLECTION_NAMES } from "../model/constants.js";
import { Product } from "../model/product.js";
import { ShoppingCart } from "../model/shopping_cart.js";
import { AccountInfo } from "../model/account_info.js";
import { Comment } from "../model/comment.js";
const db = getFirestore();
export async function getProductList() {
    const products = [];
    const q = query(collection(db, COLLECTION_NAMES.PRODUCT), orderBy('name'));
    const snapShot = await getDocs(q);

    const q2 = query(collection(db, COLLECTION_NAMES.PURCHASE_HISTORY));
    const snapShot2 = await getDocs(q2);

    const q3 = query(collection(db, COLLECTION_NAMES.COMMENT));
    const snapShot3 = await getDocs(q3);

    let arr = []
    snapShot2.forEach(doc => arr.push(doc.data().items))
    let arr1 = [].concat.apply([], arr);
    let resultArr = [];
    for (let arrObj of arr1) {
        var index = resultArr.findIndex(resultObj => resultObj.name == arrObj.name)
        if (index == -1) {
            arrObj.totalSold = 1;
            resultArr.push(arrObj);
        }
        else {
            resultArr[index].totalSold += 1;
        }
    }

    snapShot.forEach(doc => {
        const p = new Product(doc.data());
        p.set_docId(doc.id);
        p.set_totalSold(resultArr.find(res => res.name === doc.data().name)?.totalSold || 0)
        let arrr = []
        snapShot3.forEach(docc => {
            if (docc.data().pid === doc.id) {
                arrr.push(docc.data().rating)
            }
        });
        let sumOfRatings = arrr.reduce((a, b) => a + b, 0);
        let avgOfRatings = parseInt(sumOfRatings / arrr.length) || 0;
        p.set_avgRating(avgOfRatings)
        products.push(p);
    });

    return products;
}
export async function checkout(cart) {
    const data = cart.serialize(Date.now());
    await addDoc(collection(db, COLLECTION_NAMES.PURCHASE_HISTORY), data);
}
export async function getPurchaseHistory(uid) {
    const q = query(collection(db, COLLECTION_NAMES.PURCHASE_HISTORY),
        where('uid', '==', uid),
        orderBy('timestamp', 'desc'));
    const snapShot = await getDocs(q);

    const carts = [];
    snapShot.forEach(doc => {
        const sc = ShoppingCart.deserialize(doc.data());
        carts.push(sc);
    });
    return carts;
}
export async function getAccountInfo(uid) {
    const docRef = doc(db, COLLECTION_NAMES.ACCOUNT_INFO, uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return new AccountInfo(docSnap.data());
    } else {
        const defaultInfo = AccountInfo.instance();
        const accountDocRef = doc(db, COLLECTION_NAMES.ACCOUNT_INFO, uid);
        await setDoc(accountDocRef, defaultInfo.serialize());
        return defaultInfo;
    }
}
export async function updateAccountInfo(uid, updateInfo) {
    // updateInfo = {key:value}
    const docRef = doc(db, COLLECTION_NAMES.ACCOUNT_INFO, uid);
    await updateDoc(docRef, updateInfo);
}

export async function getReviews() {
    const reviews = [];
    const q = query(collection(db, COLLECTION_NAMES.COMMENT), orderBy('timestamp'));
    const snapShot = await getDocs(q);

    snapShot.forEach(doc => {
        const c = new Comment(doc.data());
        c.set_docId(doc.id);
        reviews.push(c);
    });

    return reviews.reverse();
}

export async function addReview(review) {
    let docRef = await addDoc(collection(db, COLLECTION_NAMES.COMMENT), review);
    return docRef.id;
}

export async function updateReview(reviewId, newData) {
    const docRef = doc(db, COLLECTION_NAMES.COMMENT, reviewId);
    await updateDoc(docRef, newData);
}

export async function deleteReview(reviewId) {
    await deleteDoc(doc(db, COLLECTION_NAMES.COMMENT, reviewId))
}