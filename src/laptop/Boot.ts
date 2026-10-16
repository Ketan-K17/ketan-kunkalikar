import { USER } from './desktop';
import { el } from './dom';
import { GLYPH, ICON } from './icons';
import { play } from './sound';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
export const wait = (ms: number) => new Promise((r) => setTimeout(r, reduceMotion.matches ? Math.min(ms, 250) : ms));

const spinner = () => el('div', { class: 'mac-spinner' }, ...Array.from({ length: 12 }, (_, i) => el('i', { style: `--i:${i}` })));

/** What the status line under the progress bar says while starting up, Panther style. */
const STEPS = ['Starting Mac OS X…', 'Initializing network', 'Loading Determination…', 'Polishing projects', 'Starting desktop'];

/**
 * The screens around the desktop: start up (grey Apple and spinner, then the "Mac OS X" panel with its progress
 * bar), shut down (blue screen and spinner) and the login window shown after Log Out. Plain DOM over the desktop;
 * MacScreen decides when each one runs.
 */
export class BootScreens {
  readonly el: HTMLElement;
  private grey: HTMLElement;
  private panel: HTMLElement;
  private bar: HTMLElement;
  private step: HTMLElement;
  private down: HTMLElement;
  private login: HTMLElement;
  private loginUser: HTMLElement;
  private loginPass: HTMLElement;
  private password: HTMLInputElement;
  private onLogin: (() => void) | null = null;

  constructor(power: { sleep(): void; restart(): void; shutdown(): void }) {
    this.grey = el('div', { class: 'boot-grey' }, el('div', { class: 'mac-boot-apple', html: GLYPH.apple }), spinner());
    this.bar = el('div', { class: 'boot-bar-fill' });
    this.step = el('div', { class: 'boot-step' });
    this.panel = el(
      'div',
      { class: 'boot-blue' },
      el('div', { class: 'boot-panel' }, el('div', { class: 'boot-logo' }, el('span', { class: 'boot-apple', html: GLYPH.apple }), el('span', { text: 'Mac OS X' })), el('div', { class: 'boot-bar' }, this.bar), this.step),
    );
    this.down = el('div', { class: 'boot-down' }, spinner());

    this.password = el('input', { class: 'login-input', type: 'password', placeholder: 'Password', 'aria-label': 'Password', autocomplete: 'off' });
    this.password.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        void this.submit();
      }
    });
    const logIn = el('button', { class: 'aq-btn default', type: 'button', text: 'Log In', onclick: () => void this.submit() });
    const back = el('button', { class: 'aq-btn', type: 'button', text: 'Back', onclick: () => this.showUsers() });
    this.loginUser = el(
      'button',
      { class: 'login-user', type: 'button', onclick: () => this.pickUser() },
      el('span', { class: 'login-pic', html: ICON.user }),
      el('span', { class: 'login-name', text: USER.name }),
    );
    this.loginPass = el('div', { class: 'login-pass' }, el('span', { class: 'login-pic big', html: ICON.user }), el('div', { class: 'login-name', text: USER.name }), this.password, el('div', { class: 'login-btns' }, back, logIn));
    const pbtn = (label: string, run: () => void) => el('button', { class: 'login-power', type: 'button', onclick: run }, el('span', { class: 'login-power-ico', html: ICON.laptop }), el('span', { text: label }));
    this.login = el(
      'div',
      { class: 'boot-login' },
      el(
        'div',
        { class: 'login-panel' },
        el('div', { class: 'boot-logo' }, el('span', { class: 'boot-apple', html: GLYPH.apple }), el('span', { text: 'Mac OS X' })),
        el('div', { class: 'login-sub', text: USER.computer }),
        el('div', { class: 'login-users' }, this.loginUser),
        this.loginPass,
        el('div', { class: 'login-powers' }, pbtn('Sleep', power.sleep), pbtn('Restart', power.restart), pbtn('Shut Down', power.shutdown)),
      ),
    );
    this.el = el('div', { class: 'mac-boot' }, this.grey, this.panel, this.down, this.login);
  }

  get loggedOut() {
    return this.login.classList.contains('on');
  }

  /** Grey Apple and spinner, then the progress panel. Resolves when the desktop may appear. */
  async startUp() {
    this.show(this.grey);
    play('boot');
    await wait(1700);
    this.bar.style.transition = 'none';
    this.bar.style.width = '0%';
    this.show(this.panel);
    void this.bar.offsetWidth;
    this.bar.style.transition = '';
    for (let i = 0; i < STEPS.length; i++) {
      this.step.textContent = STEPS[i];
      this.bar.style.width = `${((i + 1) / STEPS.length) * 100}%`;
      await wait(330);
    }
    await this.fadeOut();
  }

  /** The blue screen with a spinner while everything quits, then black. */
  async shutDown() {
    this.show(this.down);
    await wait(1100);
  }

  /** The login window. Resolves after the owner logs back in. */
  logOut(): Promise<void> {
    this.showUsers();
    this.show(this.login);
    return new Promise((r) => (this.onLogin = r));
  }

  hide() {
    this.el.classList.remove('on', 'done');
    for (const s of [this.grey, this.panel, this.down, this.login]) s.classList.remove('on');
  }

  private show(screen: HTMLElement) {
    this.el.classList.remove('done');
    this.el.classList.add('on');
    for (const s of [this.grey, this.panel, this.down, this.login]) s.classList.toggle('on', s === screen);
  }

  private async fadeOut() {
    this.el.classList.add('done');
    await wait(450);
    this.hide();
  }

  private showUsers() {
    this.login.classList.remove('pass');
    this.password.value = '';
  }

  private pickUser() {
    play('click', 0.6);
    this.login.classList.add('pass');
    setTimeout(() => this.password.focus(), 50);
  }

  /** Any password will do: it is your own laptop, on your own portfolio. */
  private async submit() {
    if (!this.onLogin) return;
    this.password.blur();
    this.login.classList.add('busy');
    await wait(700);
    this.login.classList.remove('busy');
    const done = this.onLogin;
    this.onLogin = null;
    await this.fadeOut();
    done();
  }
}
