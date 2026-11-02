const LOCAL_HOSTS = ["localhost", "127.0.0.1"];
const isLocal = LOCAL_HOSTS.includes(window.location.hostname);

export const config = Object.freeze({
  apiBaseUrl: isLocal
    ? "http://localhost:3000/api/v1"
    : "https://cmdb-back-end.onrender.com/api/v1",
  requestTimeoutMs: 60000, // the free Render instance can take a while to wake up
  tokenKey: "cmdb_access_token",
  userKey: "cmdb_user",
  pageSize: 30,
});
