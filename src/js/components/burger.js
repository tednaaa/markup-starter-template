export default class Burger {
	constructor({ burgerSelector, windowSelector }) {
		this.burger = document.querySelector(burgerSelector);
		this.window = document.querySelector(windowSelector);

		if (this.burger && this.window) {
			this.burger.addEventListener('click', () => {
				this.burger.classList.toggle('active');
				this.window.classList.toggle('active');
			});
		}
	}
}
