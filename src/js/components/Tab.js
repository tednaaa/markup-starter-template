export class Tab {
  constructor({ tabBtns, tabWindows }) {
    this.tabBtns = document.querySelectorAll(tabBtns);
    this.tabWindows = document.querySelectorAll(tabWindows);

    if (this.tabBtns) {
      this.tabBtns.forEach((btn) => {
        btn.addEventListener('click', (event) => {
          this.tabBtns.forEach((btn) => btn.classList.remove('active'));
          event.target.classList.add('active');

          this.selectTabWindows(event.target.getAttribute('data-tab-href'));
        });
      });
    }
  }

  selectTabWindows(tab) {
    if (this.tabWindows) {
      this.tabWindows.forEach((item) => {
        item.classList.contains(tab)
          ? item.classList.add('active')
          : item.classList.remove('active');
      });
    }
  }
}
