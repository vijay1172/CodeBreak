import { useState } from 'react';
import { useWorkshops } from '../hooks/useWorkshops.js';
import { RegistrationForm } from '../components/RegistrationForm.jsx';
import { BookingReceipt } from '../components/BookingReceipt.jsx';
import { Notice } from '../components/Notice.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
export function BookingPage() {
  const workshops = useWorkshops();
  const [registration, setRegistration] = useState(null);
  return <main><h1>Book a workshop</h1><Notice error={workshops.error}/><LoadingState loading={workshops.loading}><RegistrationForm workshops={workshops.data?.workshops || []} onBooked={setRegistration}/></LoadingState><BookingReceipt registration={registration}/></main>;
}
