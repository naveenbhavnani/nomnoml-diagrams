import { useFeatureSupport } from "@canva/app-hooks";
import { TestAppI18nProvider } from "@canva/app-i18n-kit";
import { TestAppUiProvider } from "@canva/app-ui-kit";
import { upload } from "@canva/asset";
import { addElementAtPoint } from "@canva/design";
import type { Feature } from "@canva/platform";
import { fireEvent, render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import type { ReactNode } from "react";
import { App } from "../app";

function renderInTestProvider(node: ReactNode): RenderResult {
  return render(
    <TestAppI18nProvider>
      <TestAppUiProvider>{node}</TestAppUiProvider>
    </TestAppI18nProvider>,
  );
}

jest.mock("@canva/app-hooks");
jest.mock("@canva/asset");
jest.mock("@canva/design");

describe("Nomnoml Diagrams App", () => {
  const mockIsSupported = jest.fn();
  const mockUseFeatureSupport = jest.mocked(useFeatureSupport);
  const mockUpload = jest.mocked(upload);
  const mockAddElementAtPoint = jest.mocked(addElementAtPoint);

  beforeEach(() => {
    jest.resetAllMocks();
    mockIsSupported.mockImplementation(
      (fn: Feature) => fn === addElementAtPoint,
    );
    mockUseFeatureSupport.mockReturnValue(mockIsSupported);
    mockUpload.mockResolvedValue({
      ref: { type: "image", value: "test-ref" },
      whenUploaded: jest.fn().mockResolvedValue(undefined),
    } as never);
    mockAddElementAtPoint.mockResolvedValue(undefined);
  });

  it("should render the default diagram code", () => {
    const result = renderInTestProvider(<App />);

    // Check that the default code is rendered
    const textarea = result.container.querySelector("textarea");
    expect(textarea?.value).toContain("[User|");
    expect(textarea?.value).toContain("login()");
  });

  it("should render SVG preview for valid nomnoml code", () => {
    const result = renderInTestProvider(<App />);

    // Check that an SVG is rendered in the preview
    const svg = result.container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("should show error for invalid nomnoml syntax", () => {
    const result = renderInTestProvider(<App />);

    // Get the textarea and enter invalid syntax
    const textarea = result.container.querySelector("textarea");
    if (textarea) {
      fireEvent.change(textarea, { target: { value: "[Invalid[Syntax" } });
    }

    // Check that the Add to Design button is disabled when there's an error
    const addButton = result.getByRole("button", { name: "Add to Design" });
    expect(addButton.hasAttribute("disabled")).toBe(true);
  });

  it("should add diagram to design when button is clicked", async () => {
    const result = renderInTestProvider(<App />);

    // Get the Add to Design button
    const addButton = result.getByRole("button", {
      name: "Add to Design",
    });

    fireEvent.click(addButton);

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
      expect(mockAddElementAtPoint).toHaveBeenCalled();
    });
  });

  it("should have a consistent snapshot", () => {
    const result = renderInTestProvider(<App />);
    expect(result.container).toMatchSnapshot();
  });
});
