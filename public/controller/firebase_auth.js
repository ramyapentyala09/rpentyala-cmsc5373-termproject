import {
    getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged,
    createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/9.6.7/firebase-auth.js"

import * as Elements from '../viewpage/elements.js'
import { DEV } from "../model/constants.js";
import { routing, ROUTE_PATHNAMES } from "./route.js";
import * as Util from '../viewpage/util.js'
import { initShoppingCart } from "../viewpage/cart_page.js";
import { readAccountProfile } from "../viewpage/profile_page.js";



const auth = getAuth();
export let currentUser = null;
export function addEventListeners() {

    onAuthStateChanged(auth, authStateChanged);

    Elements.modalSignin.form.addEventListener('submit', async e => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;
        const button = e.target.getElementsByTagName('button')[0];
        const label = Util.disableButton(button);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            Elements.modalSignin.modal.hide();
        } catch (e) {
            if (DEV) console.log(e);
            Util.info('Sign in Error', JSON.stringify(e), Elements.modalSignin.modal);
        }
        Util.enableButton(button, label);
    });

    Elements.MENU.SignOut.addEventListener('click', async () => {
        try {
            await signOut(auth);
        } catch (e) {
            if (DEV) console.log(e);
            Util.info('Signout Error', JSON.stringify(e));
        }
    });
Elements.modalSignin.showSignupModal.addEventListener('click', () => {
    Elements.modalSignin.modal.hide();
    Elements.modalSignup.form.reset(); // clear form data
    Elements.modalSignup.modal.show();
});

Elements.modalSignup.form.addEventListener('submit', async e => {
    e.preventDefault();
    const email = e.target.email.value;
    const password = e.target.password.value;
    const passwordConfirm = e.target.passwordConfirm.value;
    if (password != passwordConfirm) {
        window.alert('Two passwords do not match!');
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        Util.info('Account Created!', `You are now signed in as ${email}`, Elements.modalSignup.modal);


    } catch (e) {
        if (DEV) console.log(e);
        Util.info('Failed to create account', JSON.stringify(e), Elements.modalSignup.modal)

    }
});
}
async function authStateChanged(user) {
    currentUser = user;
    if (user) {
        document.getElementById("form-create-review").style.display = "block";
        let menus = document.getElementsByClassName('modal-preauth');
        for (let i = 0; i < menus.length; i++) {
            menus[i].style.display = 'none';
        }
        menus = document.getElementsByClassName('modal-postauth');
        for (let i = 0; i < menus.length; i++) {
            menus[i].style.display = 'block';
        }
        await readAccountProfile();
        initShoppingCart();
        routing(window.location.pathname, window.location.hash);

    } else {
        document.getElementById("form-create-review").style.display = "none";
        let menus = document.getElementsByClassName('modal-preauth');
        for (let i = 0; i < menus.length; i++) {
            menus[i].style.display = 'block';
        }
        menus = document.getElementsByClassName('modal-postauth');
        for (let i = 0; i < menus.length; i++) {
            menus[i].style.display = 'none';
        }
        history.pushState(null, null, ROUTE_PATHNAMES.HOME);
        routing(window.location.pathname, window.location.hash);

    }
}