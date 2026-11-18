import XCTest

final class TabletTests: XCTestCase {
    private let app = XCUIApplication(bundleIdentifier: "md.dcor.bukvygost.pilot.qa")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 15))
    }

    override func tearDownWithError() throws {
        XCUIDevice.shared.orientation = .portrait
    }

    func testSampleSettingsAndFingerScroll() {
        app.buttons["Образец"].tap()
        XCTAssertTrue(app.buttons["Закрыть образец"].waitForExistence(timeout: 5))
        app.buttons["Закрыть образец"].tap()

        app.buttons["Настройки"].tap()
        XCTAssertTrue(app.buttons["Закрыть настройки"].waitForExistence(timeout: 5))
        let precise = app.switches["Точнее"]
        let standard = app.switches["Обычно"]
        precise.tap()
        XCTAssertEqual(precise.value as? String, "1")
        standard.tap()
        XCTAssertEqual(standard.value as? String, "1")
        app.buttons["Для разработки"].tap()
        XCTAssertTrue(app.staticTexts["Повторы букв и элементов"].waitForExistence(timeout: 5))
        app.buttons["Закрыть настройки"].tap()

        let upperLetter = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label == %@", "Буква А, проба 1")).firstMatch
        let top = app.webViews.firstMatch
        let before = upperLetter.frame.minY
        top.swipeUp()
        XCTAssertLessThan(upperLetter.frame.minY, before - 40)
        top.swipeDown()
        XCTAssertTrue(app.buttons["Образец"].isHittable)
        attach("portrait")
    }

    func testLandscapeAndRelaunch() {
        XCUIDevice.shared.orientation = .landscapeLeft
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 5))
        XCTAssertGreaterThan(app.frame.width, app.frame.height)
        app.buttons["Образец"].tap()
        XCTAssertTrue(app.buttons["Закрыть образец"].waitForExistence(timeout: 5))
        attach("landscape-sample")
        app.buttons["Закрыть образец"].tap()
        app.terminate()
        app.launch()
        XCTAssertTrue(app.buttons["Образец"].waitForExistence(timeout: 15))
        XCTAssertGreaterThan(app.webViews.firstMatch.frame.width, app.webViews.firstMatch.frame.height)
        attach("landscape-relaunch")
    }

    private func attach(_ name: String) {
        let attachment = XCTAttachment(screenshot: XCUIScreen.main.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
