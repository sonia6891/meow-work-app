import WidgetKit
import SwiftUI

private let meowWidgetAppGroup = "group.com.lumilab.meowwork.shared"
private let meowWidgetPaydayKey = "paydayDay"

struct MeowDateEntry: TimelineEntry {
    let date: Date
    let paydayDay: Int
}

struct MeowDateProvider: TimelineProvider {
    private func paydayDay() -> Int {
        let value = UserDefaults(suiteName: meowWidgetAppGroup)?.integer(forKey: meowWidgetPaydayKey) ?? 0
        return (1...31).contains(value) ? value : 0
    }

    private func entry(at date: Date = Date()) -> MeowDateEntry {
        MeowDateEntry(date: date, paydayDay: paydayDay())
    }

    func placeholder(in context: Context) -> MeowDateEntry {
        MeowDateEntry(date: Date(), paydayDay: 5)
    }

    func getSnapshot(in context: Context, completion: @escaping (MeowDateEntry) -> Void) {
        completion(entry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MeowDateEntry>) -> Void) {
        let now = Date()
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let tomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))
            ?? now.addingTimeInterval(86_400)
        completion(Timeline(entries: [entry(at: now)], policy: .after(tomorrow)))
    }
}

private struct MeowPaydayInfo {
    let date: Date
    let days: Int
}

struct MeowDateWidgetView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.colorScheme) private var colorScheme
    let entry: MeowDateEntry

    private var calendar: Calendar {
        var value = Calendar(identifier: .gregorian)
        value.locale = Locale(identifier: "zh_Hant_TW")
        value.timeZone = .current
        return value
    }

    private var day: String { String(calendar.component(.day, from: entry.date)) }
    private var month: String { "\(calendar.component(.month, from: entry.date))月" }

    private var fullDate: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy年M月d日"
        return formatter.string(from: entry.date)
    }

    private var weekday: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.timeZone = .current
        formatter.dateFormat = "EEEE"
        return formatter.string(from: entry.date)
    }

    private var payday: MeowPaydayInfo? {
        guard (1...31).contains(entry.paydayDay) else { return nil }
        let today = calendar.startOfDay(for: entry.date)
        var year = calendar.component(.year, from: today)
        var month = calendar.component(.month, from: today)

        func dateForPayday(year: Int, month: Int) -> Date? {
            guard let monthStart = calendar.date(from: DateComponents(year: year, month: month, day: 1)),
                  let range = calendar.range(of: .day, in: .month, for: monthStart) else { return nil }
            return calendar.date(from: DateComponents(year: year, month: month, day: min(entry.paydayDay, range.count)))
        }

        guard var target = dateForPayday(year: year, month: month) else { return nil }
        if target < today {
            month += 1
            if month > 12 { month = 1; year += 1 }
            guard let next = dateForPayday(year: year, month: month) else { return nil }
            target = next
        }
        let days = calendar.dateComponents([.day], from: today, to: target).day ?? 0
        return MeowPaydayInfo(date: target, days: max(0, days))
    }

    private var countdownTitle: String {
        guard let info = payday else { return "尚未設定發薪日" }
        return info.days == 0 ? "今天發薪 🎉" : "距離發薪日 \(info.days) 天"
    }

    private var paydayDateText: String {
        guard let info = payday else { return "到 App 設定每月發薪日" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.timeZone = .current
        formatter.dateFormat = "M月d日"
        return "下次發薪 " + formatter.string(from: info.date)
    }

    private var background: Color {
        colorScheme == .dark ? Color(red: 0.094, green: 0.071, blue: 0.059) : Color(red: 1.0, green: 0.976, blue: 0.941)
    }
    private var card: Color {
        colorScheme == .dark ? Color(red: 0.165, green: 0.129, blue: 0.114) : Color(red: 1.0, green: 0.945, blue: 0.835)
    }
    private var ink: Color {
        colorScheme == .dark ? Color(red: 0.969, green: 0.933, blue: 0.910) : Color(red: 0.32, green: 0.16, blue: 0.10)
    }
    private var muted: Color {
        colorScheme == .dark ? Color(red: 0.79, green: 0.71, blue: 0.65) : Color(red: 0.52, green: 0.38, blue: 0.31)
    }
    private var accent: Color {
        colorScheme == .dark ? Color(red: 0.93, green: 0.69, blue: 0.40) : Color(red: 0.83, green: 0.43, blue: 0.08)
    }

    var body: some View {
        ZStack {
            background
            switch family {
            case .systemLarge: largeBody
            case .systemMedium: mediumBody
            default: smallBody
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("今天 \(fullDate) \(weekday)，\(countdownTitle)，\(paydayDateText)")
    }

    private var smallBody: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .top) {
                mascot(size: 42)
                Spacer(minLength: 4)
                Text(month).font(.system(size: 14, weight: .bold, design: .rounded)).foregroundStyle(muted)
            }
            Spacer(minLength: 0)
            Text(day).font(.system(size: 46, weight: .black, design: .rounded)).foregroundStyle(ink).minimumScaleFactor(0.72)
            Text(weekday).font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(muted)
            Text(countdownTitle).font(.system(size: 12, weight: .black, design: .rounded)).foregroundStyle(accent).lineLimit(1).minimumScaleFactor(0.78)
        }.padding(13)
    }

    private var mediumBody: some View {
        HStack(spacing: 14) {
            mascot(size: 88)
            VStack(alignment: .leading, spacing: 3) {
                Text(fullDate).font(.system(size: 15, weight: .bold, design: .rounded)).foregroundStyle(muted)
                Text(weekday).font(.system(size: 17, weight: .black, design: .rounded)).foregroundStyle(ink)
                Spacer(minLength: 5)
                Text(countdownTitle).font(.system(size: 25, weight: .black, design: .rounded)).foregroundStyle(accent).minimumScaleFactor(0.72).lineLimit(1)
                Text(paydayDateText).font(.system(size: 12, weight: .semibold, design: .rounded)).foregroundStyle(muted)
            }
            Spacer(minLength: 0)
        }.padding(14)
    }

    private var largeBody: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 14) {
                mascot(size: 94)
                VStack(alignment: .leading, spacing: 2) {
                    Text("今天").font(.system(size: 13, weight: .bold, design: .rounded)).foregroundStyle(muted)
                    Text(fullDate).font(.system(size: 24, weight: .black, design: .rounded)).foregroundStyle(ink)
                    Text(weekday).font(.system(size: 16, weight: .bold, design: .rounded)).foregroundStyle(muted)
                }
                Spacer(minLength: 0)
            }

            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .fill(card)
                .overlay(
                    VStack(alignment: .leading, spacing: 5) {
                        Text("社畜的人生就靠發薪日續命")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundStyle(muted)
                        Text(countdownTitle)
                            .font(.system(size: 34, weight: .black, design: .rounded))
                            .foregroundStyle(accent)
                            .minimumScaleFactor(0.72)
                            .lineLimit(1)
                        Text(paydayDateText)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundStyle(ink.opacity(0.76))
                    }.padding(16),
                    alignment: .leading
                )
                .frame(maxWidth: .infinity, minHeight: 122)

            Spacer(minLength: 0)
            Text("喵的，又要上班了")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(muted.opacity(0.8))
        }.padding(16)
    }

    @ViewBuilder
    private func mascot(size: CGFloat) -> some View {
        Image("WidgetCat")
            .resizable()
            .scaledToFit()
            .frame(width: size, height: size)
            .background(card)
            .clipShape(RoundedRectangle(cornerRadius: size * 0.23, style: .continuous))
    }
}

@main
struct MeowDateWidget: Widget {
    let kind = "MeowDateWidget"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: MeowDateProvider()) { entry in
            MeowDateWidgetView(entry: entry)
        }
        .configurationDisplayName("日期與發薪倒數")
        .description("顯示今天日期，以及距離下一個發薪日還有幾天。")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
