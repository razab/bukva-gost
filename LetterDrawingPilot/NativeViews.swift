import SwiftUI
import WebKit
import UniformTypeIdentifiers

struct NativeWorkspace: View {
    @StateObject private var controller = PilotLesson.Coordinator()
    @State private var numbers = false
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    private var version: String {
        let release = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
        let build = Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "—"
        return "Версия \(release) (\(build))"
    }
    var body: some View {
        NavigationStack {
            PilotLesson(controller: controller)
                .navigationTitle("")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { controller.present(.letters) } label: {
                            Label("Выбрать букву", systemImage: "square.grid.2x2")
                                .frame(minWidth: 44, minHeight: 44)
                                .contentShape(Rectangle())
                        }
                        .labelStyle(.iconOnly)
                        .buttonStyle(.plain)
                        .accessibilityIdentifier("show-letters")
                        .disabled(controller.controlsUnavailable)
                    }
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button { controller.command("undo") } label: { Label("Отменить последнее действие", systemImage: "arrow.uturn.backward").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.iconOnly).buttonStyle(.plain).disabled(!controller.state.canUndo || controller.controlsUnavailable)
                        Button { controller.present(.sample) } label: { Label("Образец", systemImage: "pencil.tip").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.titleAndIcon).buttonStyle(.plain).disabled(controller.controlsUnavailable)
                        Menu {
                            Section {
                                Button("Настройки", systemImage: "gearshape") { controller.present(.settings) }
                                Button("Моя практика", systemImage: "chart.bar") { controller.present(.progress) }
                                Divider()
                                Button("Сохранить копию…", systemImage: "square.and.arrow.up") { controller.command("export") }
                            } header: {
                                Text(version)
                            }
                        } label: { Label("Ещё", systemImage: "ellipsis").labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                        .menuStyle(.button).buttonStyle(.plain)
                        .accessibilityIdentifier("lesson-menu")
                        .disabled(controller.controlsUnavailable)
                    }
                }
                .navigationDestination(isPresented: $numbers) { NativeNumbers() }
        }
        .tint(Color(uiColor: .systemGreen))
        .sheet(item: $controller.sheet, onDismiss: controller.didDismiss) { destination in
            if #available(iOS 18.0, *), destination == .letters {
                sheetNavigation(destination)
                    .presentationSizing(LetterPickerSizing())
            } else if #available(iOS 18.0, *), destination == .result, !dynamicTypeSize.isAccessibilitySize {
                sheetNavigation(destination)
                    .presentationSizing(SessionResultSizing())
            } else {
                sheetNavigation(destination)
            }
        }
        .alert("Не удалось выполнить действие", isPresented: Binding(get: { controller.error != nil }, set: { if !$0 { controller.error = nil } })) {
            Button("Закрыть", role: .cancel) { controller.error = nil }
        } message: { Text(controller.error ?? "") }
    }

    private func sheetNavigation(_ destination: NativeSheet) -> some View {
        NavigationStack {
            sheetContent(destination)
                .navigationTitle(destination == .result ? "" : destination.title)
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button { controller.sheet = nil } label: {
                            Label("Закрыть", systemImage: "xmark")
                                .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                        }
                        .labelStyle(.iconOnly).buttonStyle(.plain).accessibilityIdentifier("close-sheet")
                    }
                }
        }
        .presentationDragIndicator(.visible)
    }

    @ViewBuilder private func sheetContent(_ destination: NativeSheet) -> some View {
        switch destination {
        case .letters:
            NativeLetters(controller: controller) {
                controller.chooseFromLetterPicker { numbers = true }
            }
            .background(LetterPickerAnchor(controller: controller).frame(width: 0, height: 0))
        case .settings: NativeSettings(controller: controller)
        case .progress: NativeProgress(controller: controller)
        case .result: if let result = controller.result { NativeSessionResult(controller: controller, result: result) }
        case .sample: NativeDocument(name: "sample", fragment: controller.state.letter)
        case .editor: NativeDocument(name: "index", fragment: "author-" + String(controller.state.letter.unicodeScalars.first!.value, radix: 16))
        }
    }
}

@available(iOS 18.0, *)
private struct LetterPickerSizing: PresentationSizing {
    func proposedSize(for root: PresentationSizingRoot, context: PresentationSizingContext) -> ProposedViewSize {
        // Five rows plus the difficulty control and system sheet header.
        ProposedViewSize(width: 660, height: 500)
    }
}

@available(iOS 18.0, *)
private struct SessionResultSizing: PresentationSizing {
    func proposedSize(for root: PresentationSizingRoot, context: PresentationSizingContext) -> ProposedViewSize {
        ProposedViewSize(width: 720, height: 424)
    }
}

private struct NativeNumbers: View {
    @StateObject private var controller = PilotLesson.Coordinator(fragment: "numbers")
    var body: some View {
        PilotLesson(controller: controller)
            .navigationTitle("Цифры и знаки")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { controller.command("undo") } label: {
                        Label("Отменить последнее действие", systemImage: "arrow.uturn.backward")
                            .frame(minWidth: 44, minHeight: 44).contentShape(Rectangle())
                    }.labelStyle(.iconOnly).buttonStyle(.plain)
                        .disabled(!controller.state.canUndo || controller.controlsUnavailable)
                }
            }
    }
}

private struct LetterImage: View {
    let letter: String
    var color: Color = .primary
    var body: some View {
        Image("Letter-" + String(letter.unicodeScalars.first!.value, radix: 16))
            .renderingMode(.template).resizable().scaledToFit().foregroundStyle(color)
            .accessibilityHidden(true)
    }
}

private struct LetterPickerAnchor: UIViewControllerRepresentable {
    let controller: PilotLesson.Coordinator

    func makeUIViewController(context: Context) -> UIViewController {
        let anchor = UIViewController()
        controller.letterPickerAnchor = anchor
        return anchor
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

private struct NativeLetters: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    let openNumbers: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            Picker("Сложность", selection: Binding(get: { controller.state.level }, set: { controller.command("level", ["level": $0]) })) {
                Text("Легче").tag("easy")
                Text("Обычно").tag("standard")
                Text("Точнее").tag("precise")
            }
            .pickerStyle(.segmented)
            .controlSize(.large)
            .frame(maxWidth: 400, minHeight: 44)
            .padding(.horizontal, 16)
            .padding(.top, 4)

            if ["ideal", "impossible", "custom"].contains(controller.state.level) {
                Text("Технический допуск")
                    .font(.footnote)
                    .foregroundStyle(.secondary)
            }

            ViewThatFits(in: .vertical) {
                grid.fixedSize(horizontal: false, vertical: true)
                ScrollView { grid }
            }
        }
        .background(Color(uiColor: .systemGroupedBackground))
    }

    private var grid: some View {
        LazyVGrid(columns: [GridItem(.adaptive(minimum: 74), spacing: 8)], spacing: 8) {
            ForEach(controller.lessons) { item in
                let selected = item.letter == controller.state.letter
                Button {
                    controller.chooseFromLetterPicker {
                        controller.command("select", ["letter": item.letter])
                    }
                } label: {
                    tile(selected: selected, score: item.score) { LetterImage(letter: item.letter) }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(item.letter + " " + item.letter.lowercased())
                .accessibilityValue(item.score.map { "Последний результат \($0) процентов" } ?? "Нет результата")
                .accessibilityAddTraits(selected ? .isSelected : [])
                .accessibilityIdentifier("letter-" + String(item.letter.unicodeScalars.first!.value, radix: 16))
            }
            Button(action: openNumbers) {
                tile {
                    Image("PickerNumbers").renderingMode(.template).resizable().scaledToFit()
                }
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Цифры и знаки")
            .accessibilityIdentifier("choose-numbers")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 14)
    }

    private func tile<Artwork: View>(
        selected: Bool = false, score: Int? = nil, @ViewBuilder artwork: () -> Artwork
    ) -> some View {
        artwork()
            .foregroundStyle(.primary)
            .frame(height: 38)
            .padding(.horizontal, 9)
            .frame(maxWidth: .infinity)
            .frame(height: 64)
            .background(
                selected ? Color.green.opacity(0.15) : Color(uiColor: .secondarySystemGroupedBackground),
                in: RoundedRectangle(cornerRadius: 10)
            )
            .overlay {
                if selected {
                    RoundedRectangle(cornerRadius: 10).strokeBorder(.green.opacity(0.65), lineWidth: 1.5)
                }
            }
            .overlay(alignment: .bottom) {
                if let score {
                    ProgressView(value: Double(score), total: 100)
                        .tint(score >= 90 ? .green : .orange)
                        .padding(.horizontal, 12)
                        .padding(.bottom, 6)
                        .accessibilityHidden(true)
                }
            }
            .contentShape(Rectangle())
    }
}

private struct NativeSettings: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    @State private var importing = false

    private func option(_ title: String, key: String) -> some View {
        Toggle(title, isOn: Binding(
            get: { controller.state.options?[key] == true },
            set: { controller.command("option", ["key": key, "enabled": $0]) }
        ))
        .accessibilityIdentifier("show-" + key)
    }

    var body: some View {
        Form {
            Section("На листе") {
                option("Схемы со стрелками", key: "schemes")
                option("Ещё упражнения", key: "additional")
                option("Самостоятельная проба", key: "independent")
            }
            Section("Перо") {
                NativeSlider(controller: controller, key: "penWidth", title: "Толщина пера", range: 0.5...8, step: 0.5, unit: " px")
                Picker("Плавность", selection: Binding(get: { Int(controller.state.preferences["smoothing"] ?? 0) }, set: { controller.command("configure", ["smoothing": $0]) })) {
                    Text("Без сглаживания").tag(0); Text("Мягкое").tag(1); Text("Сильнее").tag(2)
                }.accessibilityIdentifier("smoothing-mode")
                Canvas { context, size in
                    let points = controller.state.penPreview ?? []
                    var path = Path()
                    for (index, point) in points.enumerated() where point.count == 2 {
                        let position = CGPoint(x: point[0] * size.width / 220, y: point[1])
                        if index == 0 { path.move(to: position) } else { path.addLine(to: position) }
                    }
                    context.stroke(path, with: .color(Color(red: 0.2, green: 0.37, blue: 0.6)), style: StrokeStyle(lineWidth: controller.state.preferences["penWidth"] ?? 3, lineCap: .round, lineJoin: .round))
                }.frame(height: 44).accessibilityLabel("Вид пера")
                Toggle("Только стилусом", isOn: Binding(get: { controller.state.stylusOnly }, set: { controller.command("stylus", ["enabled": $0]) }))
            }
            Section("Резервная копия") {
                Button("Сохранить копию…", systemImage: "square.and.arrow.up") { controller.afterDismiss { controller.command("export") } }
                Button("Открыть копию…", systemImage: "folder") { importing = true }
                if !controller.state.backupSummary.isEmpty { Text(controller.state.backupSummary).font(.footnote).foregroundStyle(.secondary) }
                if controller.state.canRestore { Button("Восстановить") { controller.command("restore") } }
            }
            Section {
                NavigationLink { NativeDeveloperSettings(controller: controller) } label: { Label("Для разработки", systemImage: "hammer") }
            }
        }
        .fileImporter(isPresented: $importing, allowedContentTypes: [.json]) { result in
            switch result {
            case .success(let url): controller.importBackup(url)
            case .failure(let error):
                let failure = error as NSError
                if failure.domain != NSCocoaErrorDomain || failure.code != NSUserCancelledError { controller.error = error.localizedDescription }
            }
        }
    }
}

private struct NativeDeveloperSettings: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    private let styles = ["Тетрадь", "Тёплая мастерская", "Мозаика", "Чертёжный лист", "Альбом"]
    var body: some View {
        Form {
            Section("Практика") {
                Picker("Повторы букв и элементов", selection: Binding(get: { Int(controller.state.preferences["practiceRepeats"] ?? 0) }, set: { controller.command("configure", ["practiceRepeats": $0]) })) {
                    Text("По составу").tag(0)
                    ForEach(1...10, id: \.self) { Text(String($0)).tag($0) }
                }.accessibilityIdentifier("practice-repeats")
                Button("Состав текущей страницы", systemImage: "list.bullet.rectangle") { controller.afterDismiss { controller.present(.editor) } }
            }
            Section("Лист") {
                NativeSlider(controller: controller, key: "size", title: "Размер букв", range: 30...160, step: 1, unit: " px")
                NativeSlider(controller: controller, key: "bold", title: "Толщина букв", range: 100...150, step: 5, unit: "%")
                NativeSlider(controller: controller, key: "rowGap", title: "Между рядами", range: 0...80, step: 1, unit: " px")
                NativeSlider(controller: controller, key: "leftInset", title: "Отступ букв слева", range: 0...30, step: 1, unit: "%")
                NativeSlider(controller: controller, key: "columnGap", title: "Между пробами", range: 0...60, step: 1, unit: " px")
                NativeSlider(controller: controller, key: "letterGap", title: "Между буквами в слове", range: 0...50, step: 1, unit: "%")
            }
            Section("Технический допуск") {
                NativeSlider(controller: controller, key: "tolerance", title: "Допуск от траектории", range: 0.5...16, step: 0.5, unit: " px")
                Button("Идеально · ±2 px") { controller.command("level", ["level": "ideal"]) }
                Button("Невозможно · ±1 px") { controller.command("level", ["level": "impossible"]) }
            }
            Section("Оформление") {
                Picker("Оформление", selection: Binding(get: { controller.state.variant }, set: { controller.command("style", ["index": $0]) })) {
                    ForEach(styles.indices, id: \.self) { Text(styles[$0]).tag($0) }
                }
            }
            Section {
                Button("Сбросить технические настройки") { controller.command("defaults") }
                Button("Взять прежние настройки") { controller.command("legacy") }
                Button("Сбросить всё на текущем листе", role: .destructive) { controller.command("clearAll") }.disabled(!(controller.state.hasAnyInk ?? controller.state.hasWork))
                if let notice = controller.state.notice, !notice.isEmpty { Text(notice).font(.footnote).foregroundStyle(.secondary) }
            }
        }.navigationTitle("Для разработки")
    }
}

private struct NativeSlider: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    let key: String
    let title: String
    let range: ClosedRange<Double>
    let step: Double
    let unit: String
    @State private var draft: Double = 0
    init(controller: PilotLesson.Coordinator, key: String, title: String, range: ClosedRange<Double>, step: Double, unit: String) {
        self.controller = controller; self.key = key; self.title = title
        self.range = range; self.step = step; self.unit = unit
        _draft = State(initialValue: controller.state.preferences[key] ?? range.lowerBound)
    }
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack { Text(title); Spacer(); Text(draft.formatted() + unit).foregroundStyle(.secondary).monospacedDigit() }
            NativeValueSlider(value: $draft, range: range, step: step, title: title, identifier: "setting-" + key) {
                controller.command("configure", [key: $0])
            }.frame(height: 44)
        }
        .padding(.vertical, 4)
        .onAppear { draft = controller.state.preferences[key] ?? range.lowerBound }
        .onChange(of: controller.state.preferences[key]) { _, value in draft = value ?? range.lowerBound }
    }
}

// Commit the UISlider's final value directly, rather than a SwiftUI gesture snapshot.
private struct NativeValueSlider: UIViewRepresentable {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let title: String
    let identifier: String
    let commit: (Double) -> Void
    func makeCoordinator() -> Handler { Handler(self) }
    func makeUIView(context: Context) -> UISlider {
        let slider = UISlider()
        slider.minimumValue = Float(range.lowerBound); slider.maximumValue = Float(range.upperBound)
        slider.accessibilityLabel = title; slider.accessibilityIdentifier = identifier
        slider.addTarget(context.coordinator, action: #selector(Handler.changed(_:)), for: .valueChanged)
        slider.addTarget(context.coordinator, action: #selector(Handler.finished(_:)), for: [.touchUpInside, .touchUpOutside, .touchCancel])
        return slider
    }
    func updateUIView(_ slider: UISlider, context: Context) {
        context.coordinator.parent = self
        if !slider.isTracking { slider.value = Float(value) }
        slider.accessibilityValue = value.formatted()
    }
    final class Handler: NSObject {
        var parent: NativeValueSlider
        init(_ parent: NativeValueSlider) { self.parent = parent }
        private func read(_ slider: UISlider) -> Double {
            let value = parent.range.lowerBound + ((Double(slider.value) - parent.range.lowerBound) / parent.step).rounded() * parent.step
            return min(parent.range.upperBound, max(parent.range.lowerBound, value))
        }
        @objc func changed(_ slider: UISlider) {
            let value = read(slider)
            parent.value = value; slider.accessibilityValue = value.formatted()
            if !slider.isTracking { parent.commit(value) }
        }
        @objc func finished(_ slider: UISlider) {
            let value = read(slider)
            parent.value = value; slider.accessibilityValue = value.formatted(); parent.commit(value)
        }
    }
}

private struct NativeProgress: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    var body: some View {
        List {
            let practiced = controller.lessons.filter { $0.sessions > 0 }
            if practiced.isEmpty { ContentUnavailableView("Пока нет занятий", systemImage: "pencil.line", description: Text("Здесь появятся сохранённые занятия.")) }
            ForEach(practiced) { item in
                VStack(alignment: .leading, spacing: 12) {
                    HStack {
                        LetterImage(letter: item.letter).frame(width: 65, height: 40)
                        Spacer()
                        if let score = item.score { Text("\(score)%").monospacedDigit().font(.title3.weight(.medium)) }
                    }
                    Text("Занятий: \(item.sessions) · \(item.difficulty)").font(.footnote).foregroundStyle(.secondary)
                    if let score = item.independentScore { Text("Самостоятельно: \(score)%").font(.footnote).foregroundStyle(.secondary) }
                    if let task = item.repeat {
                        if let last = task.recent?.last, let best = task.best { Text(task.label + " · последняя: \(last)% · лучшая: \(best)%").font(.footnote).foregroundStyle(.secondary) }
                        Button("Повторить: " + task.label) {
                            controller.afterDismiss { controller.command("repeat", ["letter": item.letter, "task": ["id": task.id, "label": task.label]]) }
                        }
                    }
                }.padding(.vertical, 6)
            }
        }
    }
}

private struct NativeSessionResult: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    @State private var stamped = false
    let result: NativeResult

    private let green = Color(red: 0.16, green: 0.38, blue: 0.29)
    private var ink: Color { colorScheme == .dark ? Color(red: 0.67, green: 0.87, blue: 0.74) : green }
    private var detailInk: Color {
        colorScheme == .dark ? Color(red: 0.73, green: 0.79, blue: 0.75)
            : Color(red: 0.30, green: 0.36, blue: 0.33)
    }
    private let numberLocale = Locale(identifier: "ru_RU")

    var body: some View {
        GeometryReader { viewport in
            ScrollView {
                VStack(spacing: 24) {
                    if viewport.size.width >= 600 && !dynamicTypeSize.isAccessibilitySize {
                        HStack(alignment: .center, spacing: 32) {
                            achievement.frame(width: 246)
                            statistics.frame(maxWidth: .infinity)
                        }
                    } else {
                        stacked
                    }
                    Divider()
                    actions
                }
                .frame(maxWidth: 672)
                .padding(.horizontal, 24)
                .padding(.top, 16)
                .padding(.bottom, 24)
                .frame(maxWidth: .infinity, minHeight: viewport.size.height)
            }
        }
        .accessibilityIdentifier("session-result-content")
        .onAppear {
            if result.saved && !reduceMotion && !stamped {
                withAnimation(.spring(duration: 0.36, bounce: 0.22)) { stamped = true }
            }
        }
    }

    private var stacked: some View {
        VStack(alignment: .leading, spacing: 22) {
            achievement
            statistics
        }
    }

    private var achievement: some View {
        VStack(alignment: .leading, spacing: 14) {
            RoundedRectangle(cornerRadius: 16)
                .fill(colorScheme == .dark ? Color(red: 0.13, green: 0.21, blue: 0.18)
                      : Color(red: 0.92, green: 0.95, blue: 0.89))
                .frame(height: 142)
                .overlay {
                    Canvas { context, size in
                        let rules = Path { path in
                            for fraction in [0.20, 0.38, 0.73, 0.91] {
                                let y = size.height * fraction
                                path.move(to: CGPoint(x: 14, y: y))
                                path.addLine(to: CGPoint(x: size.width - 14, y: y))
                            }
                        }
                        context.stroke(rules, with: .color(ink.opacity(0.24)), lineWidth: 1)
                    }
                    LetterImage(letter: result.letter, color: ink)
                        .frame(width: 192, height: 110)
                        .offset(x: 8, y: -1)
                }
                .overlay(alignment: .bottomTrailing) {
                    stamp.padding(10)
                }
                .accessibilityLabel(Text("Буква " + result.letter))
                .accessibilityAddTraits(.isImage)
            Text(result.saved ? "Занятие сохранено" : "Занятие завершено")
                .font(.title2.bold())
                .accessibilityAddTraits(.isHeader)
                .accessibilityIdentifier("session-result-title")
                .fixedSize(horizontal: false, vertical: true)
            if !result.saved {
                Text("Результат не удалось сохранить.")
                    .font(.subheadline)
                    .foregroundStyle(detailInk)
            }
        }
    }

    private var stamp: some View {
        let animated = result.saved && !reduceMotion
        return Image(systemName: result.saved ? "checkmark" : "exclamationmark")
            .font(.system(size: 22, weight: .bold))
            .foregroundStyle(.white)
            .frame(width: 44, height: 44)
            .background(result.saved ? green : Color(red: 0.53, green: 0.32, blue: 0.09), in: .circle)
            .padding(3)
            .background(Color(uiColor: .systemBackground), in: .circle)
            .rotationEffect(.degrees(animated && !stamped ? -20 : -8))
            .scaleEffect(animated && !stamped ? 1.26 : 1)
            .accessibilityHidden(true)
    }

    private var statistics: some View {
        let stats = result.statistics
        return VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
                Text(percent(stats.overall))
                    .font(.largeTitle.weight(.bold).monospacedDigit())
                    .foregroundStyle(ink)
                Text("Средняя точность")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(detailInk)
            }
            .accessibilityElement(children: .combine)
            .accessibilityIdentifier("session-result-overall")

            Text(stats.difficulty + " · ±" + stats.tolerance.formatted(.number.locale(numberLocale)) + " px")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(detailInk)
                .accessibilityIdentifier("session-result-difficulty")

            Divider()
            scoreLine("Заглавная", group: stats.upper)
            Divider()
            scoreLine("Строчная", group: stats.lower)
            Divider()
            Text("Время — касания пера, без пауз. Самостоятельные пробы не учитываются.")
                .font(.footnote)
                .foregroundStyle(detailInk)
                .fixedSize(horizontal: false, vertical: true)
        }
    }

    private func percent(_ group: SessionGroup) -> String {
        group.score.map { "\($0)%" } ?? "—"
    }

    private func scoreLine(_ title: String, group: SessionGroup) -> some View {
        LabeledContent {
            VStack(alignment: .trailing, spacing: 3) {
                let time = group.meanMs.map {
                    ($0 / 1000).formatted(.number.precision(.fractionLength(1)).locale(numberLocale)) + " с"
                }
                Text(percent(group) + (time.map { " · " + $0 } ?? (group.count > 0 ? " · время —" : "")))
                    .font(.body.weight(.semibold).monospacedDigit())
                if let count = group.timedCount, count > 0, count < group.count {
                    Text("Время по \(count) из \(group.count)")
                        .font(.footnote)
                        .foregroundStyle(detailInk)
                }
            }
            .foregroundStyle(.primary)
        } label: {
            Text(title)
        }
        .accessibilityElement(children: .combine)
    }

    private var actions: some View {
        ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) {
                Spacer(minLength: 0)
                repeatLesson
                nextLesson
            }
            VStack(spacing: 10) {
                nextLesson
                repeatLesson
            }
        }
        .buttonBorderShape(.capsule)
    }

    private var repeatLesson: some View {
        Button { controller.sheet = nil } label: {
            Text("Ещё потренироваться")
                .font(.body.weight(.semibold))
                .fixedSize(horizontal: false, vertical: true)
                .padding(.horizontal, 10)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
        }
        .buttonStyle(.bordered)
        .tint(ink)
        .accessibilityIdentifier("session-result-repeat")
    }

    @ViewBuilder private var nextLesson: some View {
        if controller.state.canNext, let next = controller.state.nextLetter {
            Button {
                controller.afterDismiss { controller.command("next") }
            } label: {
                HStack(spacing: 9) {
                    Text(result.letter)
                    Image(systemName: "arrow.right")
                    Text(next)
                }
                .font(.body.weight(.semibold))
                .padding(.horizontal, 14)
                .frame(minWidth: 44, minHeight: 44)
                .contentShape(Rectangle())
            }
            .buttonStyle(.borderedProminent)
            .tint(green)
            .accessibilityLabel("Следующая буква: " + next)
            .accessibilityIdentifier("session-result-next")
        }
    }
}

private struct NativeDocument: UIViewRepresentable {
    let name: String
    let fragment: String
    func makeUIView(context: Context) -> WKWebView {
        let view = WKWebView(frame: .zero)
        view.allowsLinkPreview = false
        if let url = Bundle.main.url(forResource: name, withExtension: "html", subdirectory: "Web"),
           var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.fragment = fragment
            if let destination = components.url { view.loadFileURL(destination, allowingReadAccessTo: url.deletingLastPathComponent()) }
        }
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
}
