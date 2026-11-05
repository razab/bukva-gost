import SwiftUI
import PencilKit

private let ink = Color(red: 0.18, green: 0.25, blue: 0.29)
private let guide = Color(red: 0.69, green: 0.76, blue: 0.76)

struct LetterPage: View {
    @State private var canvas = PKCanvasView()
    @State private var replay = 0
    @State private var confirmClear = false
    private let drawingURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("letter-a.drawing")

    var body: some View {
        GeometryReader { geometry in
            let width = min(geometry.size.width - 32, 820.0)
            ScrollView {
                VStack(spacing: 18) {
                    HStack {
                        Text("Буква А").font(.system(size: 30, weight: .bold, design: .rounded))
                        Spacer()
                        Button { confirmClear = true } label: { Label("Очистить", systemImage: "trash") }
                    }
                    .foregroundStyle(ink)
                    HStack(spacing: 24) {
                        AnimatedLetter(replay: replay).frame(width: 140, height: 160)
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Посмотри, как писать").font(.title2.bold())
                            Text("Вверх, вниз и перекладина.").foregroundStyle(.secondary)
                            Button { replay += 1 } label: { Label("Показать ещё раз", systemImage: "play.fill") }
                                .buttonStyle(.borderedProminent)
                        }
                        Spacer(minLength: 0)
                    }.padding(20).frame(maxWidth: .infinity, alignment: .leading)
                        .background(.white, in: RoundedRectangle(cornerRadius: 22))
                    Text("Обведи буквы и дорисуй арбуз").font(.title2.bold()).frame(maxWidth: .infinity, alignment: .leading)
                    ZStack {
                        Worksheet().allowsHitTesting(false)
                        PencilSurface(canvas: canvas, drawingURL: drawingURL)
                    }
                    .frame(width: width, height: width * 0.72)
                    .background(.white, in: RoundedRectangle(cornerRadius: 22))
                    .clipShape(RoundedRectangle(cornerRadius: 22))
                    Text("Рисуй Apple Pencil или пальцем. Рисунок сохраняется на этом устройстве.")
                        .font(.footnote).foregroundStyle(.secondary).frame(maxWidth: .infinity, alignment: .leading)
                }.frame(width: width).padding(.vertical, 24)
            }.frame(maxWidth: .infinity).background(Color(red: 0.94, green: 0.97, blue: 0.95))
        }
        .confirmationDialog("Очистить лист?", isPresented: $confirmClear, titleVisibility: .visible) {
            Button("Очистить рисунок", role: .destructive) {
                canvas.drawing = PKDrawing()
                try? canvas.drawing.dataRepresentation().write(to: drawingURL, options: .atomic)
            }
        } message: { Text("Все твои линии на этом листе будут удалены.") }
    }
}

struct LetterShape: Shape {
    let part: Int
    func path(in rect: CGRect) -> Path {
        var p = Path()
        let x = rect.minX, y = rect.minY, w = rect.width, h = rect.height
        switch part {
        case 0: p.move(to: CGPoint(x: x + w * 0.1, y: y + h * 0.9)); p.addLine(to: CGPoint(x: x + w * 0.5, y: y + h * 0.1))
        case 1: p.move(to: CGPoint(x: x + w * 0.5, y: y + h * 0.1)); p.addLine(to: CGPoint(x: x + w * 0.9, y: y + h * 0.9))
        default: p.move(to: CGPoint(x: x + w * 0.3, y: y + h * 0.58)); p.addLine(to: CGPoint(x: x + w * 0.7, y: y + h * 0.58))
        }
        return p
    }
}

struct AnimatedLetter: View {
    let replay: Int
    @State private var progress: [CGFloat] = [0, 0, 0]
    var body: some View {
        ZStack {
            ForEach(0..<3) { i in
                LetterShape(part: i).stroke(guide.opacity(0.35), style: StrokeStyle(lineWidth: 9, lineCap: .round, lineJoin: .round))
                LetterShape(part: i).trim(from: 0, to: progress[i]).stroke(ink, style: StrokeStyle(lineWidth: 9, lineCap: .round, lineJoin: .round))
            }
        }
        .accessibilityLabel("Буква А: первый штрих снизу вверх, второй сверху вниз, затем перекладина слева направо")
        .task(id: replay) {
            progress = [0, 0, 0]
            for i in 0..<3 {
                guard !Task.isCancelled else { return }
                withAnimation(.linear(duration: 0.8)) { progress[i] = 1 }
                try? await Task.sleep(for: .milliseconds(900))
            }
        }
    }
}

struct Worksheet: View {
    var body: some View {
        GeometryReader { g in
            let w = g.size.width, h = g.size.height
            ZStack(alignment: .topLeading) {
                ForEach(0..<4) { n in
                    ForEach(0..<3) { part in
                        LetterShape(part: part)
                            .stroke(guide, style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [6, 7]))
                            .frame(width: w * 0.17, height: h * 0.35)
                            .position(x: w * (0.16 + CGFloat(n) * 0.225), y: h * 0.25)
                    }
                }
                Path { p in
                    p.move(to: CGPoint(x: w * 0.25, y: h * 0.70))
                    p.addQuadCurve(to: CGPoint(x: w * 0.75, y: h * 0.70), control: CGPoint(x: w * 0.50, y: h * 1.08))
                }.stroke(ink, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                Path { p in
                    p.move(to: CGPoint(x: w * 0.25, y: h * 0.70))
                    p.addQuadCurve(to: CGPoint(x: w * 0.75, y: h * 0.70), control: CGPoint(x: w * 0.50, y: h * 0.52))
                }.stroke(guide, style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [6, 7]))
                Text("Арбуз").font(.headline).foregroundStyle(ink).position(x: w * 0.5, y: h * 0.94)
            }
        }.accessibilityLabel("Четыре пунктирные буквы А и арбуз с пунктирной верхней линией")
    }
}

struct PencilSurface: UIViewRepresentable {
    let canvas: PKCanvasView
    let drawingURL: URL
    func makeCoordinator() -> Coordinator { Coordinator(url: drawingURL) }
    func makeUIView(context: Context) -> PKCanvasView {
        canvas.backgroundColor = .clear
        canvas.isOpaque = false
        canvas.isScrollEnabled = false
        canvas.drawingPolicy = .anyInput
        canvas.tool = PKInkingTool(.pen, color: .systemBlue, width: 5)
        if let data = try? Data(contentsOf: drawingURL), let drawing = try? PKDrawing(data: data) { canvas.drawing = drawing }
        canvas.delegate = context.coordinator
        return canvas
    }
    func updateUIView(_ view: PKCanvasView, context: Context) {}
    final class Coordinator: NSObject, PKCanvasViewDelegate {
        let url: URL
        init(url: URL) { self.url = url }
        func canvasViewDrawingDidChange(_ canvasView: PKCanvasView) {
            try? canvasView.drawing.dataRepresentation().write(to: url, options: .atomic)
        }
    }
}
