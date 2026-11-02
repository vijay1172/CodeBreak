export const accounts = [
  { id: 'maya', name: 'Maya Shah', role: 'borrower' },
  { id: 'noah', name: 'Noah Kim', role: 'borrower' },
  { id: 'riley', name: 'Riley Chen', role: 'reviewer' },
];

export const items = [
  { id: 'camera-kit', name: 'Camera kit' },
  { id: 'field-recorder', name: 'Field recorder' },
  { id: 'tripod', name: 'Tripod' },
];

export const accountById = (id) => accounts.find((account) => account.id === id);
export const itemById = (id) => items.find((item) => item.id === id);
