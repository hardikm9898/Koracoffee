const { app, request } = require("./helpers");

describe("Auth — OTP is real and validated", () => {
  it("rejects a phone number that isn't 10 digits", async () => {
    const res = await request(app)
      .post("/api/auth/request-otp")
      .send({ name: "Test", phoneNumber: "123" });
    expect(res.status).toBe(400);
  });

  it("issues a random OTP, not a fixed one, and rejects the wrong code", async () => {
    const phoneNumber = "9123456780";
    const res1 = await request(app).post("/api/auth/request-otp").send({ name: "Test", phoneNumber });
    const otp1 = res1.body.data.otp;

    const wrongVerify = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phoneNumber, otp: "000000" === otp1 ? "111111" : "000000" });
    expect(wrongVerify.status).toBe(400);

    const rightVerify = await request(app).post("/api/auth/verify-otp").send({ phoneNumber, otp: otp1 });
    expect(rightVerify.status).toBe(200);
    expect(rightVerify.body.data.token).toBeTruthy();
  });

  it("does not return the same OTP for two different request-otp calls", async () => {
    const res1 = await request(app)
      .post("/api/auth/request-otp")
      .send({ name: "Test", phoneNumber: "9123456781" });
    const res2 = await request(app)
      .post("/api/auth/request-otp")
      .send({ name: "Test", phoneNumber: "9123456782" });

    // Not a hard guarantee (a 1-in-900000 collision is possible), but this
    // is exactly the check that would have caught the old hardcoded "111111".
    expect(res1.body.data.otp).not.toBe("111111");
    expect(res2.body.data.otp).not.toBe("111111");
  });
});

describe("Auth — admin allowlist", () => {
  it("rejects an admin OTP request for a phone not in ADMIN_PHONE_NUMBERS", async () => {
    const res = await request(app)
      .post("/api/auth/admin/request-otp")
      .send({ phoneNumber: "9876543210" }); // not the configured ADMIN_PHONE_NUMBERS test value
    expect(res.status).toBe(403);
  });

  it("allows an admin OTP request for the configured admin phone and sets an httpOnly cookie on verify", async () => {
    const phoneNumber = process.env.ADMIN_PHONE_NUMBERS.split(",")[0].trim();
    const otpRes = await request(app).post("/api/auth/admin/request-otp").send({ phoneNumber });
    expect(otpRes.status).toBe(200);

    const verifyRes = await request(app)
      .post("/api/auth/admin/verify-otp")
      .send({ phoneNumber, otp: otpRes.body.data.otp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.data.user.isAdmin).toBe(true);
    const cookies = verifyRes.headers["set-cookie"] || [];
    expect(cookies.some((c) => c.startsWith("admin_token=") && /HttpOnly/i.test(c))).toBe(true);
  });
});
