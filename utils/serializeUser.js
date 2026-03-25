export const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  role: true,
  isVerified: true,
  phonenumber: true,
  address: true,
  city: true,
  district: true,
  khoroo: true,
  firstName: true,
  lastName: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
};

export const serializeUser = (user) => {
  if (!user) return null;

  const {
    id,
    email,
    role,
    isVerified,
    phonenumber,
    address,
    city,
    district,
    khoroo,
    firstName,
    lastName,
    notes,
    createdAt,
    updatedAt,
  } = user;

  return {
    id,
    email,
    role,
    isVerified,
    phonenumber,
    address,
    city,
    district,
    khoroo,
    firstName,
    lastName,
    notes,
    createdAt,
    updatedAt,
  };
};
