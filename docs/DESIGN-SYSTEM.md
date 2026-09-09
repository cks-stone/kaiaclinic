# Kaia Clinic Design System

카이아의원 홈페이지에 디자인 요소를 추가할 때 참고하는 작업 문서입니다.

## Visual Direction

- **Mood**: 조용하고 따뜻한 메디컬 스튜디오
- **Palette**: 아이보리 `#F7F5F1`, 잉크 `#292825`, 코랄 `#E17860`, 뉴트럴 라인 `#DED9D0`
- **Type**: Pretendard 또는 Noto Sans KR + 포인트용 Georgia
- **Layout**: 큰 여백, 선명한 섹션 번호, 이미지와 텍스트의 비대칭 리듬
- **Motion**: 예약 리스트 drawer 진입, 버튼 hover 상승

## Component Map

| 영역 | 컴포넌트 후보 | 역할 |
| --- | --- | --- |
| Header | `Topbar` | 로고, 앵커 이동, 예약 리스트 진입 |
| Treatment | `ServiceCard` | 시술 이미지, 시간, 예상가, 리스트 추가 |
| Cart | `CartDrawer` | 선택 시술 검토, 총 예상 금액, 예약 정보 이동 |
| Appointment | `BookingForm` | 동의, 상담 옵션, 일정, 개인정보 입력 |
| Summary | `BookingSummary` | 선택 시술과 내원 후 결제 안내 |

## Adding a Treatment

`src/App.tsx`의 `services` 배열에 다음 데이터를 추가합니다.

```ts
{
  id: 9,
  category: '피부 · 안티에이징',
  name: '새로운 시술명',
  description: '짧은 한 줄 설명',
  duration: '30분',
  price: '150,000원',
  tag: 'NEW',
}
```

새 이미지가 필요하면 `src/assets/treatments/`에 파일을 넣고, `service-art`의 이미지 매핑을 교체합니다.

## Booking Contract

현재 프로토타입은 프론트엔드 상태로 예약 완료 화면까지 동작합니다. 실제 운영 전 다음 API 계약으로 서버를 연결합니다.

- `POST /api/appointments`
- request: `serviceIds`, `date`, `time`, `doctorConsultation`, `sedation`, `name`, `email`, `phone`, `note`, `privacyAgreed`
- response: `appointmentId`, `status`, `message`
- 결제 상태는 `PAY_ON_VISIT`로 저장

개인정보처리방침 전문, 날짜별 예약 가능 시간 API, 중복 예약 방지, 관리자 알림 발송은 백엔드 연결 단계에서 추가합니다.
