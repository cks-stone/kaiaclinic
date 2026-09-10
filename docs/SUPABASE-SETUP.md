# Supabase 예약 연동 설정

## 보안 원칙

- 브라우저에 들어가는 값은 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`뿐입니다.
- anon/publishable key는 공개되어도 되는 키지만, 보안 경계는 반드시 RLS 정책으로 구성해야 합니다.
- `service_role` key, secret key, DB password는 절대 `VITE_*`, GitHub 저장소, 프론트엔드 코드에 넣지 않습니다.
- 관리자가 예약을 조회하거나 상태를 변경하는 기능은 이후 별도 서버/Edge Function과 관리자 인증으로 구현합니다.

## Supabase에서 할 일

1. Supabase에서 새 프로젝트를 생성합니다.
2. `SQL Editor`를 엽니다.
3. [schema.sql](../supabase/schema.sql)의 전체 SQL을 붙여넣고 실행합니다.
4. `Project Settings > API`에서 `Project URL`과 `anon public` 또는 `publishable` key를 확인합니다.
5. 로컬 개발용 `.env.local`을 만들고 아래 값을 입력합니다.

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`.env.local`은 `.gitignore`에 포함되어 Git에 올라가지 않습니다.

## GitHub Pages 설정

GitHub 저장소의 `Settings > Secrets and variables > Actions`에서 Repository secrets를 추가합니다.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

이 값은 `.github/workflows/deploy-pages.yml`의 빌드 단계에만 주입됩니다. 이후 `main`에 push하면 GitHub Pages 빌드 결과에 환경변수가 포함됩니다.

## 저장되는 데이터

예약 제출 시 `appointments` 테이블에 아래 값이 저장됩니다.


개인정보가 포함되므로 Supabase Dashboard에서 백업, 보관 기간, 접근 권한, 운영자 계정을 별도로 정해야 합니다.

## 관리자 페이지 설정

관리자 화면은 사이트 하단의 `관리자` 버튼으로 들어갑니다. 일반 방문자는 예약을 생성할 수 있지만 관리자 예약 목록은 볼 수 없습니다.

1. Supabase Dashboard의 `Authentication > Users`에서 관리자 이메일/비밀번호 사용자를 생성합니다.
2. 생성된 사용자의 UUID를 복사합니다.
3. SQL Editor에서 아래 SQL을 실행해 관리자 allowlist에 등록합니다.

```sql
insert into public.admin_users (user_id)
values ('AUTH_USER_UUID');
```

4. 사이트의 `관리자` 화면에서 해당 이메일과 비밀번호로 로그인합니다.

관리자 페이지는 `appointments`에 대해 `select/update` 권한을 가지며, 예약 상태를 `REQUESTED`, `CONFIRMED`, `CANCELLED`, `COMPLETED`로 변경할 수 있습니다. 관리자 allowlist에 등록되지 않은 인증 사용자는 예약을 볼 수 없습니다.

예약 테이블의 Realtime은 `schema.sql`에서 `supabase_realtime` publication에 등록됩니다. SQL을 이미 실행한 프로젝트라면 아래 구문을 별도로 실행해도 됩니다.

```sql
alter publication supabase_realtime add table public.appointments;
```

대시보드의 `실시간 연결됨` 표시가 켜지면 새 예약 insert와 상태 변경이 화면에 즉시 반영됩니다.

## RLS 정책

현재 정책은 비회원 방문자가 예약 요청을 `insert`할 수 있지만, 누구도 브라우저에서 예약 목록을 `select`, `update`, `delete`할 수 없도록 되어 있습니다. 운영자 화면을 추가할 때는 anon 권한을 넓히지 말고, Supabase Auth 관리자 계정 또는 서버 측 Edge Function을 사용하세요.

## 테스트

환경변수와 SQL 설정 후:

```bash
npm run dev
```

예약 폼을 제출하고 Supabase Dashboard의 `Table Editor > appointments`에서 행이 생성되는지 확인합니다. 설정하지 않은 상태에서는 화면에 연결 오류가 표시되며 데이터가 전송되지 않습니다.
