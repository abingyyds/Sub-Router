import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getProviderApplication,
  sendProviderApplicationVerification,
  submitProviderApplication,
} from '../api';

const initialForm = { company_name: '', slug: '', description: '', logo: '', website: '', contact_email: '', max_rpm: 0, verification_code: '' };

export default function ProviderApplication() {
  const [application, setApplication] = useState(undefined);
  const [form, setForm] = useState(initialForm);
  const [sending, setSending] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = () => getProviderApplication().then((res) => res.data.success && setApplication(res.data.data));
  useEffect(() => { load(); }, []);

  if (application === undefined) return <div className='flex min-h-[420px] items-center justify-center'><Loader2 className='animate-spin' /></div>;
  if (application) {
    const status = application.status === 1 ? '审核通过' : application.status === 2 ? '已拒绝' : '平台审核中';
    return <div className='mx-auto max-w-3xl px-4 py-12'><div className='rounded-lg border border-page-divider bg-page-surface p-6'><CheckCircle2 className='text-page-link' /><h1 className='mt-4 text-2xl font-bold text-page'>{application.company_name}</h1><p className='mt-2 text-sm text-page-secondary'>@{application.slug} · {status}</p>{application.status === 1 && <p className='mt-5 text-sm text-page-secondary'>主站商家后台激活邮件已发送到绑定邮箱。</p>}</div></div>;
  }

  const sendCode = async () => {
    setSending(true);
    try { const res = await sendProviderApplicationVerification(); if (res.data.success) toast.success('验证码已发送'); } finally { setSending(false); }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try { const res = await submitProviderApplication({ ...form, max_rpm: Number(form.max_rpm || 0) }); if (res.data.success) { toast.success('申请已提交'); await load(); } } finally { setSubmitting(false); }
  };

  return <div className='mx-auto w-full max-w-4xl px-4 py-8 sm:px-6'><div className='border-b border-page-divider pb-5'><Building2 className='text-page-link' /><h1 className='mt-3 text-2xl font-bold text-page sm:text-3xl'>申请全球商家</h1><p className='mt-1 text-sm text-page-secondary'>平台管理员终审通过后，商家将在全局市场上线。</p></div><form onSubmit={submit} className='mt-6 grid gap-5 sm:grid-cols-2'><Field label='公司名称' value={form.company_name} onChange={(value) => setForm((prev) => ({ ...prev, company_name: value }))} required /><Field label='商家标识' value={form.slug} onChange={(value) => setForm((prev) => ({ ...prev, slug: value.toLowerCase() }))} placeholder='example-provider' required /><Field label='联系邮箱' type='email' value={form.contact_email} onChange={(value) => setForm((prev) => ({ ...prev, contact_email: value }))} /><Field label='网站' value={form.website} onChange={(value) => setForm((prev) => ({ ...prev, website: value }))} /><Field label='Logo URL' value={form.logo} onChange={(value) => setForm((prev) => ({ ...prev, logo: value }))} /><Field label='最高 RPM' type='number' value={form.max_rpm} onChange={(value) => setForm((prev) => ({ ...prev, max_rpm: value }))} /><label className='sm:col-span-2'><span className='mb-1.5 block text-sm font-medium text-page'>商家介绍</span><textarea className='input min-h-32' value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} /></label><div className='sm:col-span-2'><span className='mb-1.5 block text-sm font-medium text-page'>账户邮箱验证码</span><div className='flex gap-3'><input className='input flex-1' value={form.verification_code} onChange={(event) => setForm((prev) => ({ ...prev, verification_code: event.target.value }))} required /><button type='button' className='btn-secondary shrink-0' onClick={sendCode} disabled={sending}><Mail size={15} className='mr-1.5' />{sending ? '发送中' : '发送验证码'}</button></div></div><div className='sm:col-span-2 flex justify-end'><button type='submit' className='btn-primary' disabled={submitting}>{submitting ? '提交中' : '提交申请'}</button></div></form></div>;
}

function Field({ label, value, onChange, type = 'text', required = false, placeholder = '' }) {
  return <label><span className='mb-1.5 block text-sm font-medium text-page'>{label}</span><input type={type} className='input' value={value} onChange={(event) => onChange(event.target.value)} required={required} placeholder={placeholder} /></label>;
}
