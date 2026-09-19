import { useState } from 'react';
import { useAssignments } from '../hooks/useAssignments.js';
import { AssignmentCard } from '../components/AssignmentCard.jsx';
import { AssignmentForm } from '../components/AssignmentForm.jsx';
import { LoadingState } from '../components/LoadingState.jsx';
import { Notice } from '../components/Notice.jsx';
export function CalendarPage() {
  const [revision, setRevision] = useState(0);
  const state = useAssignments(revision);
  return <main><h1>Course calendar</h1><Notice error={state.error}/><LoadingState loading={state.loading}>{state.data?.assignments.map(assignment => <AssignmentCard key={assignment.slug} assignment={assignment}/>)}</LoadingState><section><h2>Add an assignment</h2><AssignmentForm onSaved={() => setRevision(value => value + 1)}/></section></main>;
}
