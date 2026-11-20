import SwiftUI
import WebKit
import UniformTypeIdentifiers

struct NativeWorkspace: View {
    @StateObject private var controller = PilotLesson.Coordinator()
    @State private var numbers = false
    var body: some View {
        NavigationStack {
            PilotLesson(controller: controller)
                .navigationTitle("Буквы по ГОСТ")
                .navigationBarTitleDisplayMode(.inline)
                .toolbarRole(.editor)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button { controller.present(.letters) } label: { Label("Буквы", systemImage: "square.grid.2x2").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.iconOnly).buttonStyle(.plain).accessibilityIdentifier("show-letters")
                            .disabled(controller.controlsUnavailable)
                    }
                    ToolbarItemGroup(placement: .topBarTrailing) {
                        Button { controller.command("undo") } label: { Label("Отменить последнее действие", systemImage: "arrow.uturn.backward").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.iconOnly).buttonStyle(.plain).disabled(!controller.state.canUndo || controller.controlsUnavailable)
                        Button { controller.present(.sample) } label: { Label("Образец", systemImage: "pencil.tip").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.titleAndIcon).buttonStyle(.plain).disabled(controller.controlsUnavailable)
                        Menu {
                            Button("Цифры и знаки", systemImage: "number") { numbers = true }
                            Button("Настройки", systemImage: "gearshape") { controller.present(.settings) }
                            Button("Моя практика", systemImage: "chart.bar") { controller.present(.progress) }
                            Divider()
                            Button("Сохранить копию…", systemImage: "square.and.arrow.up") { controller.command("export") }
                        } label: { Label("Ещё", systemImage: "ellipsis").labelStyle(.iconOnly).frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                        .menuStyle(.button).buttonStyle(.plain)
                        .accessibilityIdentifier("lesson-menu")
                        .disabled(controller.controlsUnavailable)
                    }
                    ToolbarItemGroup(placement: .bottomBar) {
                        Button { controller.command("independent") } label: { Label(controller.state.independent ? "Скрыть пробу" : "Без контура", systemImage: "pencil.line").fixedSize(horizontal: true, vertical: false).frame(minHeight: 44).contentShape(Rectangle()) }
                            .labelStyle(.titleAndIcon).buttonStyle(.plain).disabled(controller.controlsUnavailable).accessibilityIdentifier("independent-toggle")
                        Spacer()
                        Text(controller.state.count).font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                        Spacer()
                        Button { controller.command("finish") } label: { Text("Завершить занятие").fixedSize(horizontal: true, vertical: false).frame(minHeight: 44).contentShape(Rectangle()) }.buttonStyle(.plain).disabled(!controller.state.hasWork || controller.controlsUnavailable)
                        Button { controller.command("next") } label: { Label("Следующая буква", systemImage: "chevron.forward").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }.disabled(!controller.state.canNext || controller.controlsUnavailable)
                            .labelStyle(.iconOnly).buttonStyle(.plain)
                    }
                }
                .navigationDestination(isPresented: $numbers) { NativeNumbers() }
        }
        .tint(Color(uiColor: .systemGreen))
        .sheet(item: $controller.sheet, onDismiss: controller.didDismiss) { destination in
            NavigationStack {
                sheetContent(destination)
                    .navigationTitle(destination == .result && controller.result?.saved == false ? "Занятие завершено" : destination.title)
                    .navigationBarTitleDisplayMode(.inline)
                    .toolbar {
                        ToolbarItem(placement: .confirmationAction) {
                            Button { controller.sheet = nil } label: { Label("Закрыть", systemImage: "xmark").frame(minWidth: 44, minHeight: 44).contentShape(Rectangle()) }
                                .labelStyle(.iconOnly).buttonStyle(.plain).accessibilityIdentifier("close-sheet")
                        }
                    }
            }
            .presentationDragIndicator(.visible)
        }
        .alert("Не удалось выполнить действие", isPresented: Binding(get: { controller.error != nil }, set: { if !$0 { controller.error = nil } })) {
            Button("Закрыть", role: .cancel) { controller.error = nil }
        } message: { Text(controller.error ?? "") }
    }

    @ViewBuilder private func sheetContent(_ destination: NativeSheet) -> some View {
        switch destination {
        case .letters: NativeLetters(controller: controller) { controller.dismissLessonPicker(); numbers = true }
        case .settings: NativeSettings(controller: controller)
        case .progress: NativeProgress(controller: controller)
        case .result: if let result = controller.result { NativeSessionResult(controller: controller, result: result) }
        case .sample: NativeDocument(name: "sample", fragment: controller.state.letter)
        case .editor: NativeDocument(name: "index", fragment: "author-" + String(controller.state.letter.unicodeScalars.first!.value, radix: 16))
        }
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
                ToolbarItem(placement: .bottomBar) {
                    Text(controller.state.count).font(.footnote).foregroundStyle(.secondary).monospacedDigit()
                        .fixedSize(horizontal: true, vertical: false)
                }
            }
    }
}

private struct LetterImage: View {
    let letter: String
    var body: some View {
        Image("Letter-" + String(letter.unicodeScalars.first!.value, radix: 16))
            .renderingMode(.template).resizable().scaledToFit().foregroundStyle(.primary)
            .accessibilityHidden(true)
    }
}

private struct NativeLetters: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    let openNumbers: () -> Void
    var body: some View {
        ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 76), spacing: 12)], spacing: 12) {
                ForEach(controller.lessons) { item in
                    Button {
                        controller.command("select", ["letter": item.letter])
                        controller.dismissLessonPicker()
                    } label: {
                        VStack(spacing: 8) {
                            LetterImage(letter: item.letter).frame(height: 38)
                            if let score = item.score {
                                ProgressView(value: Double(score), total: 100).tint(score >= 90 ? .green : .orange)
                            }
                        }
                        .frame(maxWidth: .infinity).frame(height: 76)
                        .padding(8)
                        .background(item.letter == controller.state.letter ? Color.green.opacity(0.13) : Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 14))
                        .overlay(alignment: .topTrailing) {
                            if item.letter == controller.state.letter { Image(systemName: "checkmark.circle.fill").foregroundStyle(.green).padding(5) }
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(item.letter + " " + item.letter.lowercased())
                    .accessibilityValue(item.score.map { "Последний результат \($0) процентов" } ?? "Нет результата")
                    .accessibilityIdentifier("letter-" + String(item.letter.unicodeScalars.first!.value, radix: 16))
                }
            }.padding(20)
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            Button(action: openNumbers) {
                Label("Цифры и знаки", systemImage: "number").frame(maxWidth: .infinity, minHeight: 44)
            }.buttonStyle(.bordered).accessibilityIdentifier("choose-numbers")
                .padding(.horizontal, 20).padding(.vertical, 12)
                .background(Color(uiColor: .systemGroupedBackground))
        }.background(Color(uiColor: .systemGroupedBackground))
    }
}

private struct NativeSettings: View {
    @ObservedObject var controller: PilotLesson.Coordinator
    @State private var importing = false
    var body: some View {
        Form {
            Section("Сложность") {
                Picker("Сложность", selection: Binding(get: { controller.state.level }, set: { controller.command("level", ["level": $0]) })) {
                    Text("Легче").tag("easy"); Text("Обычно").tag("standard"); Text("Точнее").tag("precise")
                }.pickerStyle(.segmented)
                LabeledContent("Допуск", value: "±" + (controller.state.preferences["tolerance"] ?? 8).formatted() + " px")
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
    let result: NativeResult
    private func summary(_ group: SessionGroup) -> String {
        guard let score = group.score else { return "—" }
        return "\(score)%" + (group.meanMs.map { " · " + ($0 / 1000).formatted(.number.precision(.fractionLength(1))) + " с" } ?? "")
    }
    var body: some View {
        Form {
            Section {
                LabeledContent("Сложность", value: [12.0:"Легче",8:"Обычно",4:"Точнее",2:"Идеально",1:"Невозможно"][result.statistics.tolerance] ?? "Свой допуск")
                LabeledContent("Заглавная", value: summary(result.statistics.upper))
                LabeledContent("Строчная", value: summary(result.statistics.lower))
                LabeledContent("Общий средний", value: summary(result.statistics.overall))
                LabeledContent("Допуск", value: "±" + result.statistics.tolerance.formatted() + " px")
            } footer: { Text("Время — касания пера, без пауз. Самостоятельные пробы не учитываются.") }
            Section {
                Button("Ещё потренироваться") { controller.sheet = nil }
                if controller.state.canNext { Button("Следующая буква", systemImage: "chevron.forward") { controller.afterDismiss { controller.command("next") } } }
            }
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
