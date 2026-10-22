'use client';

import { useEffect, useState } from 'react';
import type { AdminMember, AdminSupporterPayment } from '@/lib/membership/admin';

function dollars(cents: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
}

export default function MembersPanel() {
  const [members, setMembers] = useState<AdminMember[] | null>(null);
  const [supporters, setSupporters] = useState<AdminSupporterPayment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('adminSession');
    fetch('/api/admin/members', { headers: { Authorization: `Bearer ${token}` } })
      .then(async response => {
        if (!response.ok) throw new Error();
        const data = await response.json();
        setMembers(data.members);
        setSupporters(data.supporters);
      })
      .catch(() => setError('Could not load members.'));
  }, []);

  if (error) return <p className="text-red-400">{error}</p>;
  if (!members) return <p className="text-gray-400">Loading members…</p>;

  const optedIn = members.filter(member => member.verified && member.emailUpdates);
  const copyEmails = async () => {
    await navigator.clipboard.writeText(optedIn.map(member => member.email).join(', '));
    setCopied(true);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-4">
        <p>{members.length} members · {optedIn.length} opted in to email · {supporters.length} early-access payments</p>
        <button type="button" onClick={copyEmails} disabled={!optedIn.length} className="rounded bg-violet-700 px-3 py-1 text-sm disabled:opacity-50">
          {copied ? 'Copied' : 'Copy opted-in emails'}
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="text-gray-400"><tr><th>Name</th><th>Email</th><th>Joined</th><th>Email updates</th><th>Supported</th></tr></thead>
        <tbody>
          {members.map(member => (
            <tr key={member.id} className="border-t border-white/10">
              <td>{member.name}</td>
              <td>{member.email}{member.verified ? '' : ' (unverified)'}</td>
              <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
              <td>{member.emailUpdates ? 'Yes' : '—'}</td>
              <td>{member.supportedCents ? dollars(member.supportedCents) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div>
        <h3 className="mb-2 text-lg">ESCALATION early access</h3>
        <table className="w-full text-left text-sm">
          <thead className="text-gray-400"><tr><th>Paid</th><th>Email</th><th>Member</th><th>Amount</th></tr></thead>
          <tbody>
            {supporters.map(payment => (
              <tr key={payment.sessionId} className="border-t border-white/10">
                <td>{new Date(payment.paidAt).toLocaleDateString()}</td>
                <td>{payment.email ?? '—'}</td>
                <td>{payment.memberName ?? '—'}</td>
                <td>{dollars(payment.amountCents)}{payment.livemode ? '' : ' (test)'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
