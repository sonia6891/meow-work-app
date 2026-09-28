import WidgetKit
import SwiftUI

struct MeowDateEntry: TimelineEntry {
    let date: Date
}

struct MeowDateProvider: TimelineProvider {
    func placeholder(in context: Context) -> MeowDateEntry {
        MeowDateEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (MeowDateEntry) -> Void) {
        completion(MeowDateEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<MeowDateEntry>) -> Void) {
        let now = Date()
        let calendar = Calendar(identifier: .gregorian)
        let startOfTomorrow = calendar.date(byAdding: .day, value: 1, to: calendar.startOfDay(for: now))
            ?? now.addingTimeInterval(24 * 60 * 60)
        completion(Timeline(entries: [MeowDateEntry(date: now)], policy: .after(startOfTomorrow)))
    }
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

    private var day: String {
        String(calendar.component(.day, from: entry.date))
    }

    private var month: String {
        "\(calendar.component(.month, from: entry.date))月"
    }

    private var weekday: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "zh_Hant_TW")
        formatter.timeZone = .current
        formatter.dateFormat = "EEEE"
        return formatter.string(from: entry.date)
    }

    private var background: Color {
        colorScheme == .dark
            ? Color(red: 0.10, green: 0.075, blue: 0.060)
            : Color(red: 1.00, green: 0.976, blue: 0.941)
    }

    private var card: Color {
        colorScheme == .dark
            ? Color(red: 0.18, green: 0.135, blue: 0.110)
            : Color(red: 1.00, green: 0.945, blue: 0.835)
    }

    private var ink: Color {
        colorScheme == .dark
            ? Color(red: 0.97, green: 0.91, blue: 0.86)
            : Color(red: 0.32, green: 0.16, blue: 0.10)
    }

    var body: some View {
        ZStack {
            background

            if family == .systemMedium {
                HStack(spacing: 14) {
                    mascot(size: 92)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(month)
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundStyle(ink.opacity(0.72))

                        Text(day)
                            .font(.system(size: 58, weight: .black, design: .rounded))
                            .foregroundStyle(ink)
                            .minimumScaleFactor(0.75)

                        Text(weekday)
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                            .foregroundStyle(ink.opacity(0.78))

                        Text("喵的，又要上班了")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(ink.opacity(0.56))
                            .padding(.top, 2)
                    }

                    Spacer(minLength: 0)
                }
                .padding(14)
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .top) {
                        mascot(size: 46)
                        Spacer(minLength: 4)
                        Text(month)
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                            .foregroundStyle(ink.opacity(0.70))
                    }

                    Spacer(minLength: 0)

                    Text(day)
                        .font(.system(size: 48, weight: .black, design: .rounded))
                        .foregroundStyle(ink)
                        .minimumScaleFactor(0.72)

                    Text(weekday)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(ink.opacity(0.78))
                }
                .padding(13)
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel("今天 \(month) \(day) \(weekday)")
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
        .configurationDisplayName("喵的，又要上班了")
        .description("把喵咪 App 圖示放大，直接看今天的日期。")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
