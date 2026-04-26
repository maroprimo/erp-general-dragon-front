import api from "./api";

export async function loginRequest(email, password, terminalId = "") {
  const payload = {
    email,
    password,
  };

  if (terminalId) {
    payload.terminal_id = Number(terminalId);
  }

  const res = await api.post("/login", payload);

  return {
    token: res.data?.token,
    user: res.data?.data ?? res.data?.user ?? null,
    raw: res.data,
  };
}

export async function meRequest(token) {
  const res = await api.get("/me", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data?.data ?? res.data ?? null;
}

export async function logoutRequest(token) {
  const res = await api.post(
    "/logout",
    {},
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
}