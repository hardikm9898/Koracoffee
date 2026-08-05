import { getAuthToken } from "./auth";
import { API_BASE_URL, parseApiResponse } from "./api-client";

export type AddressRecord = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  apartment?: string;
  company?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault: boolean;
};

export type CurrentUser = {
  id: string;
  name: string;
  phoneNumber: string;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  addresses: AddressRecord[];
};

export type AddressPayload = {
  label?: string;
  name: string;
  phone: string;
  address: string;
  apartment?: string;
  company?: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault?: boolean;
};

export async function getCurrentUser(): Promise<CurrentUser> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return parseApiResponse<CurrentUser>(response);
}

export async function getUserAddresses(): Promise<AddressRecord[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me/addresses`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });
  return parseApiResponse<AddressRecord[]>(response);
}

export async function addUserAddress(address: AddressPayload): Promise<AddressRecord[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me/addresses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(address),
  });
  return parseApiResponse<AddressRecord[]>(response);
}

export async function updateUserAddress(
  addressId: string,
  address: AddressPayload
): Promise<AddressRecord[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(address),
  });
  return parseApiResponse<AddressRecord[]>(response);
}

export async function deleteUserAddress(addressId: string): Promise<AddressRecord[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}/users/me/addresses/${encodeURIComponent(addressId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return parseApiResponse<AddressRecord[]>(response);
}
