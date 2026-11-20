// Red-cell compatibility: which donor blood groups can give to each recipient.
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const COMPATIBLE_DONORS = {
  'O-': ['O-'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
};

// Whole-blood donors must wait this long between donations.
const DONATION_GAP_DAYS = 90;

function normalizeBloodGroup(value) {
  if (typeof value !== 'string') return null;
  const upper = value.toUpperCase();
  const trimmed = upper.trim();
  if (BLOOD_GROUPS.includes(trimmed)) return trimmed;
  // An unencoded "+" in a query string arrives as a space ("B+" -> "B "),
  // so turn a single trailing space back into "+".
  const withPlus = upper.trimStart().replace(/\s$/, '+');
  return BLOOD_GROUPS.includes(withPlus) ? withPlus : null;
}

function compatibleDonorGroups(recipientGroup) {
  return COMPATIBLE_DONORS[recipientGroup] || [];
}

module.exports = {
  BLOOD_GROUPS,
  DONATION_GAP_DAYS,
  normalizeBloodGroup,
  compatibleDonorGroups,
};
