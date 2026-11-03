import { redirect } from 'next/navigation';

/** Time requests now live in the Leads list, next to each person's other records. */
export default function TimeRequestsRedirect() {
  redirect('/admin/dashboard/leads');
}
