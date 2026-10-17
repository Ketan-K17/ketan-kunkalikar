import { USER } from '../desktop';
import { el } from '../dom';
import { play } from '../sound';

const DRAFT_KEY = 'laptop-mail-draft';

/**
 * Mail: a Tiger-style New Message window addressed to the owner. Sending goes through Web3Forms with the same
 * VITE_WEB3FORMS_ACCESS_KEY the old site's contact form uses, so no backend is needed.
 */
export class Mail {
  readonly el: HTMLElement;
  private fields: { name: HTMLInputElement; email: HTMLInputElement; subject: HTMLInputElement; body: HTMLTextAreaElement };
  private status: HTMLElement;
  private send: HTMLButtonElement;
  private sending = false;

  constructor(private done: () => void) {
    const input = (name: string, type = 'text', placeholder = '') =>
      el('input', { class: 'mail-input', type, name, placeholder, 'aria-label': name, autocomplete: type === 'email' ? 'email' : name === 'name' ? 'name' : 'off' });
    this.fields = {
      name: input('name', 'text', 'Your name'),
      email: input('email', 'email', 'you@example.com'),
      subject: input('subject', 'text', 'What would you like to talk about?'),
      body: el('textarea', { class: 'mail-body', 'aria-label': 'Message', placeholder: 'Write your message here.', spellcheck: 'true' }),
    };
    const row = (label: string, field: HTMLElement) => el('label', { class: 'mail-row' }, el('span', { class: 'mail-label', text: `${label}:` }), field);
    this.send = el('button', { class: 'aq-btn mail-send', type: 'button', text: 'Send', onclick: () => void this.submit() });
    this.status = el('span', { class: 'mail-status' });
    this.el = el(
      'div',
      { class: 'mail' },
      el('div', { class: 'mail-bar', 'data-drag': '' }, this.send, this.status),
      el(
        'div',
        { class: 'mail-head' },
        row('To', el('span', { class: 'mail-to', text: `${USER.name} Kunkalikar` })),
        row('From', this.fields.name),
        row('Reply-To', this.fields.email),
        row('Subject', this.fields.subject),
      ),
      el('div', { class: 'mail-page' }, this.fields.body),
    );
    this.restoreDraft();
  }

  /** The unsent message from last time, if the visitor chose to keep one. */
  private restoreDraft() {
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? 'null');
      if (!d) return;
      for (const k of Object.keys(this.fields) as (keyof typeof this.fields)[]) this.fields[k].value = String(d[k] ?? '');
    } catch {
      /* no storage, or a corrupt draft: start empty */
    }
  }

  saveDraft() {
    try {
      const d = Object.fromEntries(Object.entries(this.fields).map(([k, f]) => [k, f.value]));
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch {
      /* storage unavailable: the draft is simply not kept */
    }
  }

  discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      /* nothing to remove */
    }
  }

  /** True once anything has been typed, so closing asks first. */
  get dirty() {
    return !this.sending && Object.values(this.fields).some((f) => f.value.trim() !== '');
  }

  focus() {
    this.fields.name.focus();
  }

  private say(text: string, bad = false) {
    this.status.textContent = text;
    this.status.classList.toggle('bad', bad);
  }

  private async submit() {
    if (this.sending) return;
    const f = this.fields;
    const missing = (Object.keys(f) as (keyof typeof f)[]).find((k) => !f[k].value.trim());
    if (missing) {
      play('alert');
      this.say('Please fill in every field.', true);
      return f[missing].focus();
    }
    if (!f.email.checkValidity()) {
      play('alert');
      this.say('That email address doesn’t look right.', true);
      return f.email.focus();
    }
    this.sending = true;
    this.send.disabled = true;
    this.say('Sending…');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: import.meta.env.VITE_WEB3FORMS_ACCESS_KEY,
          name: f.name.value,
          email: f.email.value,
          subject: f.subject.value,
          message: f.body.value,
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      this.discardDraft();
      play('mail-sent');
      this.say('Sent. Thanks for writing!');
      setTimeout(() => this.done(), 900);
    } catch (e) {
      console.error('[mail] send failed', e);
      play('alert');
      this.sending = false;
      this.send.disabled = false;
      this.say('Couldn’t send. Please try again.', true);
    }
  }
}
