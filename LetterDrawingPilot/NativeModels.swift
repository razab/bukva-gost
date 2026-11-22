import Foundation

struct LessonItem: Decodable, Identifiable {
    var id: String { letter }
    let letter: String
    let sessions: Int
    let score: Int?
    let difficulty: String
    let independentScore: Int?
    let `repeat`: RepeatTask?
}

struct RepeatTask: Codable { let id: String; let label: String; let best: Int?; let recent: [Int]? }

struct NativeSnapshot: Decodable {
    var kind = "state"
    var letter: String
    var preferences: [String: Double]
    var variant: Int
    var stylusOnly: Bool
    var canUndo: Bool
    var hasWork: Bool
    var hasAnyInk: Bool?
    var writing: Bool
    var independent: Bool
    var canNext: Bool
    var count: String
    var backupSummary: String
    var canRestore: Bool
    var notice: String?
    var penPreview: [[Double]]?
    var options: [String: Bool]?
    var activeLevel: String?
    var lessons: [LessonItem]?
    static let empty = NativeSnapshot(letter: "А", preferences: [:], variant: 0, stylusOnly: true, canUndo: false, hasWork: false, writing: false, independent: false, canNext: true, count: "", backupSummary: "", canRestore: false)
    var level: String { activeLevel ?? "standard" }
}

struct NativeResult: Decodable {
    let letter: String
    let statistics: SessionStatistics
    let saved: Bool
}
struct SessionStatistics: Decodable {
    let tolerance: Double
    let level: String?
    var difficulty: String {
        if let level {
            return ["easy": "Легче", "standard": "Обычно", "precise": "Точнее",
                    "ideal": "Идеально", "impossible": "Невозможно"][level] ?? "Свой допуск"
        }
        return [12.0: "Легче", 8: "Обычно", 4: "Точнее", 2: "Идеально", 1: "Невозможно"][tolerance] ?? "Свой допуск"
    }
    let upper: SessionGroup
    let lower: SessionGroup
    let overall: SessionGroup
}
struct SessionGroup: Decodable {
    let count: Int
    let score: Int?
    let meanMs: Double?
    let timedCount: Int?
}

enum NativeSheet: String, Identifiable {
    case letters, settings, progress, result, sample, editor
    var id: String { rawValue }
    var title: String {
        switch self {
        case .letters: "Буквы"
        case .settings: "Настройки"
        case .progress: "Моя практика"
        case .result: "Занятие сохранено"
        case .sample: "Образец"
        case .editor: "Состав страницы"
        }
    }
}
