/**
 * End-to-end API smoke test against a running local server.
 * Usage: node scripts/smoke-test.mjs [baseUrl]
 */
const BASE = process.argv[2] || "http://localhost:3000";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function req(path, { method = "GET", body, cookie } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = res.headers.getSetCookie?.() || [];
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json, setCookie, ok: res.ok };
}

function cookieFrom(setCookie) {
  return setCookie.map((c) => c.split(";")[0]).join("; ");
}

const loc = (lat, lng, minsAgo = 0) => ({
  latitude: lat,
  longitude: lng,
  accuracyMeters: 12,
  capturedAt: new Date(Date.now() - minsAgo * 60_000).toISOString(),
});

async function main() {
  const results = [];
  const log = (name, ok, detail = "") => {
    results.push({ name, ok, detail });
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  };

  try {
    // Home
    {
      const r = await req("/");
      log("GET /", r.status === 200 || r.status === 307 || r.status === 308, `status ${r.status}`);
    }

    // Bad login
    {
      const r = await req("/api/auth/login", {
        method: "POST",
        body: { email: "nope@example.com", password: "wrong" },
      });
      log("Login rejects bad creds", r.status === 401, `status ${r.status}`);
    }

    // Associate login
    let assocCookie = "";
    {
      const r = await req("/api/auth/login", {
        method: "POST",
        body: { email: "arjun.sales@raha.example", password: "Password123!" },
      });
      assocCookie = cookieFrom(r.setCookie);
      log(
        "Associate login",
        r.status === 200 && r.json?.user?.role === "sales_associate" && !!assocCookie,
        `status ${r.status}`
      );
    }

    // Branch head cannot use associate day API (role check)
    let headCookie = "";
    {
      const r = await req("/api/auth/login", {
        method: "POST",
        body: { email: "priya.head@raha.example", password: "Password123!" },
      });
      headCookie = cookieFrom(r.setCookie);
      log(
        "Branch head login",
        r.status === 200 && r.json?.user?.role === "branch_head" && !!headCookie,
        `status ${r.status}`
      );
    }

    {
      const r = await req("/api/day", {
        method: "POST",
        cookie: headCookie,
        body: {
          location: loc(17.385, 78.4867),
          timezoneOffsetMinutes: 330,
        },
      });
      log("Branch head blocked from start day", r.status === 403, `status ${r.status}`);
    }

    // Me
    {
      const r = await req("/api/auth/me", { cookie: assocCookie });
      log("GET /api/auth/me", r.status === 200 && r.json?.user?.email, `status ${r.status}`);
    }

    // Leads
    let leadId = "";
    {
      const r = await req("/api/leads", { cookie: assocCookie });
      leadId = r.json?.leads?.[0]?.id || "";
      log("GET /api/leads", r.status === 200 && r.json?.leads?.length > 0, `count ${r.json?.leads?.length}`);
    }

    // Close any open day first by ending it (or ignore)
    {
      const cur = await req("/api/day", { cookie: assocCookie });
      if (cur.json?.day?.status === "open") {
        const end = await req("/api/day/end", {
          method: "POST",
          cookie: assocCookie,
          body: { location: loc(17.44, 78.39) },
        });
        log("Close leftover open day", end.ok, `status ${end.status}`);
      } else {
        log("No leftover open day", true);
      }
    }

    // Start day
    {
      const r = await req("/api/day", {
        method: "POST",
        cookie: assocCookie,
        body: {
          location: loc(17.385044, 78.486671, 30),
          timezoneOffsetMinutes: 330,
        },
      });
      log(
        "Start day",
        (r.status === 201 || r.status === 200) && r.json?.day?.status === "open",
        `status ${r.status} err=${r.json?.error || ""}`
      );
    }

    // Start day twice → 409
    {
      const r = await req("/api/day", {
        method: "POST",
        cookie: assocCookie,
        body: {
          location: loc(17.385044, 78.486671),
          timezoneOffsetMinutes: 330,
        },
      });
      log("Double start day → 409", r.status === 409, `status ${r.status}`);
    }

    // Add activity
    {
      const r = await req("/api/activities", {
        method: "POST",
        cookie: assocCookie,
        body: {
          leadId,
          notes: "Smoke test meeting with lead",
          location: loc(17.448, 78.391, 10),
        },
      });
      log(
        "Log activity",
        r.status === 201 && Array.isArray(r.json?.day?.activities),
        `status ${r.status} dist=${r.json?.day?.totalDistanceKm} err=${r.json?.error || ""}`
      );
    }

    // Activity without open day after we end — later
    // End day
    {
      const r = await req("/api/day/end", {
        method: "POST",
        cookie: assocCookie,
        body: { location: loc(17.44, 78.39) },
      });
      log(
        "End day",
        r.ok && r.json?.day?.status === "closed",
        `status ${r.status} totalKm=${r.json?.day?.totalDistanceKm} err=${r.json?.error || ""}`
      );
    }

    // Activity after end → 409
    {
      const r = await req("/api/activities", {
        method: "POST",
        cookie: assocCookie,
        body: {
          leadId,
          notes: "Should fail",
          location: loc(17.45, 78.4),
        },
      });
      log("Activity after end → 409", r.status === 409, `status ${r.status}`);
    }

    // History
    {
      const r = await req("/api/day/history", { cookie: assocCookie });
      log(
        "Associate history",
        r.status === 200 && Array.isArray(r.json?.days) && r.json.days.length > 0,
        `days ${r.json?.days?.length}`
      );
    }

    // Team feed (branch head)
    {
      const today = new Date().toISOString().slice(0, 10);
      const r = await req(`/api/team?date=${today}`, { cookie: headCookie });
      log(
        "Team feed",
        r.status === 200 && Array.isArray(r.json?.associates) && r.json.associates.length >= 1,
        `associates ${r.json?.associates?.length} feed ${r.json?.feed?.length}`
      );
    }

    // Team search
    {
      const r = await req("/api/team/search?q=arjun", { cookie: headCookie });
      log(
        "Team search",
        r.status === 200 && Array.isArray(r.json?.results),
        `results ${r.json?.results?.length}`
      );
    }

    // Export CSV
    {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const r = await req(`/api/team/export?year=${y}&month=${m}`, { cookie: headCookie });
      const hasCsv = typeof r.json?.raw === "string" || r.status === 200;
      // export returns text/csv not json
      log("CSV export", r.status === 200, `status ${r.status}`);
    }

    // Associate cannot access team
    {
      const r = await req("/api/team", { cookie: assocCookie });
      log("Associate blocked from team API", r.status === 403, `status ${r.status}`);
    }

    // Logout
    {
      const r = await req("/api/auth/logout", { method: "POST", cookie: assocCookie });
      log("Logout", r.status === 200, `status ${r.status}`);
    }

    // Pages
    for (const path of ["/login", "/associate", "/branch-head"]) {
      const r = await req(path);
      // associate/branch-head redirect to login without cookie
      log(
        `Page ${path}`,
        r.status === 200 || r.status === 307 || r.status === 308,
        `status ${r.status}`
      );
    }
  } catch (e) {
    console.error("Smoke test crashed:", e);
    process.exit(1);
  }

  const failed = results.filter((r) => !r.ok);
  console.log("\n---");
  console.log(`Total: ${results.length}  Passed: ${results.length - failed.length}  Failed: ${failed.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  • ${f.name}: ${f.detail}`));
    process.exit(1);
  }
}

main();
