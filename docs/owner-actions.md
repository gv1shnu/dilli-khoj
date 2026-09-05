# Owner actions

These are the remaining tasks that require the project owner, external accounts or
the target classroom environment. Engineering work that can run entirely in this
repository remains with development.

1. **Provide a working container runtime.** Install and start Docker Desktop, Colima
   or another Supabase-compatible Docker runtime on the development Mac. The Supabase
   CLI is installed, but `supabase start` cannot create the disposable integration
   stack without a container daemon.
2. **Provide two approved test identities.** Make two Google accounts from the
   approved institutions available for end-to-end testing. Confirm that the existing
   Supabase and Google OAuth configuration may be used for this test. No passwords or
   recovery codes should be committed or copied into project documents.
3. **Arrange the final physical classroom check.** The automated Air/Pro Retina matrix
   passes, including four-times CPU-throttled Air profiles. Identify the oldest student
   MacBook model, year and RAM, and provide the real campus network. Schedule an
   extended fullscreen test and confirm the acceptable load-time and frame-rate budget.
4. **Enable native-browser automation or supervise the manual pass.** Safari currently
   has **Allow remote automation** disabled, and macOS Computer Use
   permission for native-app control. Enable those settings for repeatable Safari and
   Firefox interaction testing, or perform the final native-browser checklist with
   development observing.
5. **Schedule the content revision.** The twenty primary questions and forty revisits
   need a separate, owner-led editorial pass and blind student/teacher solves. This is
   intentionally postponed while physical gameplay and performance are stabilized.
6. **Review the release candidate.** When development presents the exact commit,
   migration list, monitoring plan and rollback steps, approve or reject the live
   rollout. Production order remains migrations, judge, then web.

Until items 1–4 are available, local browser, WebKit and mocked-auth evidence can
reduce risk but cannot prove Supabase integration, classroom capacity or installed
native-browser behavior.
Item 6 is the final
production authorization boundary.
