"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { signIn, signUp } from "@/lib/auth-client";

type Mode = "sign-in" | "sign-up";

/**
 * Signup takes an invite code alongside the usual fields. The server is the
 * real gate (see src/lib/auth.ts); requiring it here only saves a round trip.
 */
export function AuthForm({
  mode,
  initialInviteCode = "",
}: {
  mode: Mode;
  initialInviteCode?: string;
}) {
  const router = useRouter();
  const isSignUp = mode === "sign-up";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    // better-auth's sign-up body schema accepts arbitrary extra fields at
    // runtime, but the generated client type lists only the built-in ones.
    // The invite code is read by the before-hook in src/lib/auth.ts.
    const signUpWithInvite = signUp.email as (input: {
      name: string;
      email: string;
      password: string;
      inviteCode: string;
    }) => ReturnType<typeof signUp.email>;

    const result = isSignUp
      ? await signUpWithInvite({ name, email, password, inviteCode })
      : await signIn.email({ email, password });

    if (result.error) {
      setError(result.error.message ?? "Something went wrong. Try again.");
      setBusy(false);
      return;
    }

    router.push("/recipes");
    router.refresh();
  }

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 6 }}>
      <Card>
        <CardContent>
          <Stack component="form" onSubmit={handleSubmit} spacing={2.5}>
            <Box>
              <Typography variant="h2">
                {isSignUp ? "Create your account" : "Welcome back"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {isSignUp
                  ? "Meal Magic is invite-only. You will need a code from someone already using it."
                  : "Sign in to see the family recipe box."}
              </Typography>
            </Box>

            {error ? <Alert severity="error">{error}</Alert> : null}

            {isSignUp ? (
              <>
                <TextField
                  label="Invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  slotProps={{
                    htmlInput: { style: { letterSpacing: "0.15em" } },
                  }}
                />
                <TextField
                  label="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                />
              </>
            ) : null}

            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              helperText={isSignUp ? "At least 10 characters." : undefined}
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={busy}
            >
              {busy ? "Working…" : isSignUp ? "Create account" : "Sign in"}
            </Button>

            <Typography variant="body2" color="text.secondary" align="center">
              {isSignUp ? (
                <>
                  Already have an account? <Link href="/sign-in">Sign in</Link>
                </>
              ) : (
                <>
                  Have an invite code?{" "}
                  <Link href="/sign-up">Create an account</Link>
                </>
              )}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
