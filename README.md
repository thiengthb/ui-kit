# @thiengthb/ui-kit — registry shadcn dùng chung

Bộ component frontend **dùng chung** cho mọi project React/Next trong `D:\Projects\MiniServer\`,
phân phối kiểu **shadcn custom registry** — tức **copy-in, KHÔNG phải runtime dependency**.

> **Vì sao copy-in chứ không phải npm package?** Kiến trúc MiniServer: mỗi project = repo + Docker
> image độc lập, NUC chỉ pull. Một runtime dep (`@thiengthb/ui`) sẽ bắt nuôi private registry + pipeline
> publish + nâng version đồng loạt qua nhiều repo, và đi ngược triết lý shadcn ("component là code bạn
> sở hữu, không phải dep"). Copy-in: mỗi project kéo source về, **tự sở hữu và sửa được**, không coupling
> lúc chạy. Đánh đổi: sửa một chỗ KHÔNG tự lan — khi có bản vá quan trọng thì `shadcn add` lại.

## Có gì trong registry

| Item | Mô tả | shadcn cần thêm | Ghi chú |
| --- | --- | --- | --- |
| `truncate` | Cắt 1 dòng thông minh, chỉ bật tooltip khi tràn | `tooltip` | |
| `empty-state` | Trạng thái rỗng dùng chung | – | |
| `icon-tooltip` | Tooltip read-only cho nút-icon (thay `title=`) | `tooltip` | |
| `info-hint` | Icon ⓘ mở Popover giải thích (hợp cảm ứng + a11y) | `popover` | |
| `reveal` | Hiện dần khi vào viewport, CSS thuần | – | |
| `field` | Bọc nhãn + control + hint/info cho form | (kéo kèm `info-hint`) | |
| `date-picker` | Popover + Calendar, value `YYYY-MM-DD` địa phương | `button` `calendar` `popover` | npm `date-fns`; helper nội tuyến |
| `time-picker` | Input + Popover mốc giờ, value `HH:MM` | `input` `popover` `scroll-area` | helper nội tuyến |
| `skeletons` | Bộ skeleton khớp card chuẩn cho `loading.tsx` | `skeleton` | |
| `page-header` | Header trang đồng nhất (eyebrow + h1 + action + back) | (kéo kèm `info-hint`) | ⚠️ **Next-only** (`next/link`) |

Nguồn các item nằm ở `registry/thiengthb/*.tsx`. Mọi item giả định project tiêu thụ đã có shadcn
(`@/lib/utils` có `cn`, alias `@/`) — đúng như mọi frontend MiniServer.

## 1) Build registry (tại folder này)

`shadcn build` đọc `registry.json` → sinh JSON nhúng source ra `public/r/<name>.json` (đây là thứ
project khác fetch về).

```bash
cd D:\Projects\MiniServer\ui-kit
npx shadcn@latest build      # ra public/r/*.json
```

Chạy lại lệnh này mỗi khi sửa/thêm component, rồi commit `public/r/`.

## 2) Tiêu thụ ở project khác

Có 2 cách, chọn theo nhu cầu:

### Cách A — đường dẫn LOCAL (zero-infra, dùng được ngay)

Vì mọi project ở cùng máy, trỏ thẳng vào file JSON đã build:

```bash
cd D:\Projects\MiniServer\journal
npx shadcn@latest add ../ui-kit/public/r/truncate.json
npx shadcn@latest add ../ui-kit/public/r/empty-state.json
```

shadcn tự copy component vào đúng `target`, cài npm dep (vd `lucide-react`) và kéo shadcn dep
(`tooltip`, `popover`) nếu thiếu.

### Cách B — registry có namespace (khi muốn dùng từ máy khác / gọn hơn)

Đẩy `ui-kit` lên GitHub **public** (`thiengthb/ui-kit` — chỉ là source UI, không secret), rồi khai
báo registry trong `components.json` của project tiêu thụ:

```jsonc
{
  "registries": {
    "@thiengthb": "https://raw.githubusercontent.com/thiengthb/ui-kit/main/public/r/{name}.json"
  }
}
```

Sau đó:

```bash
npx shadcn@latest add @thiengthb/truncate
npx shadcn@latest add @thiengthb/page-header   # tự kéo kèm @thiengthb/info-hint
```

> `page-header` khai báo `registryDependencies: ["@thiengthb/info-hint"]` nên CÁCH B sẽ tự kéo
> `info-hint`. Với CÁCH A, hãy `add` luôn `info-hint.json` trước page-header.

## 3) Thêm component mới vào registry

1. Tạo `registry/thiengthb/<ten>.tsx` (giữ import `@/lib/utils`, `@/components/ui/*` như trong app).
2. Thêm một mục vào `items[]` trong `registry.json`: khai báo `dependencies` (npm) + `registryDependencies`
   (shadcn primitive hoặc `@thiengthb/<item>` khác) + `files[].target`.
3. `npx shadcn@latest build` → commit.

**Chỉ đưa vào đây thứ ỔN ĐỊNH + KHÔNG gắn sản phẩm cụ thể.** KHÔNG đưa `app-shell`, `streak-chip`,
`day-nav`, `mood-picker`… (đó là UI riêng từng app).

## Quan hệ với luật chung

Đây là hiện thực hóa mục **"Frontend — chuẩn kỹ thuật chung"** trong `MiniServer/CLAUDE.md`
(skill `/react-ui-craft`): "build cái tái dùng MỘT lần". Component ở đây trích từ app `todo` (đã chạy
thật theo §12) — `todo` là implementation tham chiếu.
