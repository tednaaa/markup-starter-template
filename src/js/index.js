import 'focus-visible';
import { Burger } from './core';

document.addEventListener('DOMContentLoaded', () => {
	new Burger({
		burgerSelector: '.nav__burger',
		windowSelector: '.nav__list',
	});
});
