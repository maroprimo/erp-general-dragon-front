import api from "./api";

export async function loginRequest(email, password) {
  // Ici c'est parfait, les clés { email, password } sont bien envoyées dans le body
  const res = await api.post("/login", { email, password });
  return res.data;
}

export async function meRequest(token) {
  const res = await api.get("/me", {
    headers: {
      // AJOUT DES BACKTICKS ICI
      Authorization: `Bearer ${token}`,
    },
  });
  return res.data;
}

export async function logoutRequest(token) {
  const res = await api.post(
    "/logout",
    {}, // Body vide obligatoire pour un POST
    {
      headers: {
        // AJOUT DES BACKTICKS ICI
        Authorization: `Bearer ${token}`,
      },
    }
  );
  return res.data;
}