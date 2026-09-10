# Kaia Clinic

카이아의원(Kaia Clinic) 피부과 홈페이지와 비회원 예약 플로우 프로토타입입니다.

## Included

- 카이아의원 브랜드 홈페이지: 소개, 시술 안내, 오시는 길
- 카테고리별 시술 탐색
- 시술 장바구니 역할의 예약 리스트 drawer
- 개인정보처리방침 동의
- 원장 상담 희망 / 비희망
- 수면 마취 희망 / 비희망
- 희망 날짜와 시간 선택
- 이름, 이메일, 연락처, 요청사항 입력
- 예약 신청 완료 상태
- 결제는 내원 후 진행한다는 운영 안내
- 반응형 모바일 레이아웃
- 다국어 전환: 한국어, 번체 중국어, 영어, 일본어
- Supabase 기반 비회원 예약 요청 저장
- Supabase Auth 기반 관리자 예약 대시보드 및 Realtime 업데이트

## Run

```bash
npm install
npm run dev
```

기본 주소는 `http://localhost:5173`입니다.

## GitHub Pages

Vite의 상대 경로가 설정되어 있어 GitHub Pages 프로젝트 주소에서도 정적 파일이 정상 로드됩니다. 저장소를 GitHub에 올린 뒤 아래 순서로 Pages를 활성화합니다.

1. GitHub에서 새 저장소를 생성합니다. 예: `kaiaclinic`
2. 로컬 프로젝트에서 원격 저장소를 연결하고 `main` 브랜치로 push합니다.

```bash
git init
git add .
git commit -m "Initial Kaia Clinic website"
git branch -M main
git remote add origin https://github.com/<your-id>/kaiaclinic.git
git push -u origin main
```

3. GitHub 저장소의 `Settings > Pages`에서 `Source`를 `GitHub Actions`로 선택합니다.
4. `Actions` 탭의 `Deploy to GitHub Pages` workflow가 완료되면 아래 주소로 접속합니다.

```text
https://<your-id>.github.io/kaiaclinic/
```

이후 `main` 브랜치에 push할 때마다 `.github/workflows/deploy-pages.yml`이 자동으로 빌드하고 배포합니다.

## Docker

Docker 이미지 빌드와 컨테이너 실행:

```bash
docker compose up --build -d
```

브라우저에서 `http://localhost:8080`으로 확인합니다.

종료:

```bash
docker compose down
```

## Project Structure

```text
kaiaclinic/
  src/
    App.tsx                 # 홈페이지와 예약 상태 흐름
    App.css                 # 페이지 스타일과 반응형 규칙
    index.css               # 전역 리셋과 폰트 기본값
    assets/                 # 로컬 이미지와 브랜드 자산
  docs/
    DESIGN-SYSTEM.md        # 디자인 토큰, 컴포넌트, API 연결 기준
  design-examples/
    README.md               # 시안 파일 보관 규칙
  public/                   # 정적 파일
```

## Production Checklist

1. `POST /api/appointments` 연결
2. 개인정보처리방침 전문 페이지와 동의 버전 저장
3. 운영시간 기반 날짜/시간 availability API 연결
4. 중복 예약 방지 및 관리자 알림
5. 실사용 이미지와 지도/주소 교체
6. HTTPS, 개인정보 암호화, 접근 권한과 보관 기간 정책 확정

Supabase 예약 저장 설정은 [docs/SUPABASE-SETUP.md](docs/SUPABASE-SETUP.md)를 참고하세요. 환경변수와 SQL을 설정하면 비회원 예약 요청이 `appointments` 테이블에 저장됩니다.
