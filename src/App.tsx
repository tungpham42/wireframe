import React, { useState, useEffect, useRef } from "react";
import { Layout, Button, Space, Typography } from "antd";
import {
  BorderOutlined,
  FontColorsOutlined,
  PictureOutlined,
  DownloadOutlined,
  LayoutOutlined,
  MinusOutlined,
  PlaySquareOutlined,
} from "@ant-design/icons";
import { Rnd } from "react-rnd";
import html2canvas from "html2canvas";
import { v4 as uuidv4 } from "uuid";
import "./App.css";

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

type ElementType =
  | "button"
  | "text"
  | "image"
  | "rectangle"
  | "browser"
  | "line"
  | "video";

interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
}

const App: React.FC = () => {
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const addElement = (type: ElementType) => {
    const offset = (elements.length % 5) * 20;
    const newElement: CanvasElement = {
      id: uuidv4(),
      type,
      x: 50 + offset,
      y: 50 + offset,
      // Default sizes for new elements
      width:
        type === "browser"
          ? 500
          : type === "video"
            ? 320
            : type === "line"
              ? 200
              : 120,
      height:
        type === "browser"
          ? 350
          : type === "video"
            ? 180
            : type === "line"
              ? 4
              : 50,
      content:
        type === "button"
          ? "Click Me"
          : type === "text"
            ? "Double click to edit"
            : type === "rectangle"
              ? "Container"
              : type === "browser"
                ? "https://awesome-app.com"
                : undefined,
    };
    setElements([...elements, newElement]);
  };

  const updateElement = (id: string, newProps: Partial<CanvasElement>) => {
    setElements(
      elements.map((el) => (el.id === id ? { ...el, ...newProps } : el)),
    );
  };

  const exportCanvasToImage = async () => {
    if (!canvasRef.current) return;

    setSelectedId(null);
    setEditingId(null);

    // Brief timeout to let the UI update (removing UI controls) before capture
    setTimeout(async () => {
      try {
        const canvas = await html2canvas(canvasRef.current!, {
          backgroundColor: "#eef2ff",
          useCORS: true,
          scale: 2,
          // Ensure the capture starts at the very top-left of the wrapper
          scrollX: -window.scrollX,
          scrollY: -window.scrollY,
          windowWidth: canvasRef.current!.scrollWidth,
          windowHeight: canvasRef.current!.scrollHeight,
        } as any);

        const image = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = image;
        link.download = `wireframe-${Date.now()}.png`;
        link.click();
      } catch (err) {
        console.error("Export failed:", err);
      }
    }, 150);
  };

  const renderElementContent = (el: CanvasElement) => {
    const isEditing = editingId === el.id;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateElement(el.id, { content: e.target.value });
    };

    const handleBlur = () => setEditingId(null);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setEditingId(null);
      }
    };

    const commonProps = {
      onDoubleClick: () => setEditingId(el.id),
    };

    if (isEditing) {
      return (
        <input
          autoFocus
          value={el.content || ""}
          onChange={handleChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          style={{
            width: "100%",
            height: "100%",
            border: "2px dashed #111",
            borderRadius: "4px",
            outline: "none",
            fontFamily: "inherit",
            fontSize: "16px",
            fontWeight: "600",
            textAlign: "center",
            backgroundColor: "#fff9c4",
          }}
        />
      );
    }

    switch (el.type) {
      case "button":
        return (
          <button className="wireframe-btn" {...commonProps}>
            {el.content}
          </button>
        );
      case "text":
        return (
          <div className="wireframe-text" {...commonProps}>
            {el.content}
          </div>
        );
      case "rectangle":
        return <div className="wireframe-rect" {...commonProps}></div>;
      case "image":
        return (
          <div className="wireframe-image">
            <PictureOutlined style={{ fontSize: "36px", color: "#94a3b8" }} />
          </div>
        );
      case "browser":
        return (
          <div className="wireframe-browser" {...commonProps}>
            <div className="browser-header">
              <div className="browser-actions">
                <div className="circle"></div>
                <div className="circle"></div>
                <div className="circle"></div>
              </div>
              <div className="browser-url-bar">{el.content}</div>
            </div>
            <div className="browser-content-area"></div>
          </div>
        );
      case "line":
        return <div className="wireframe-line" {...commonProps}></div>;
      case "video":
        return (
          <div className="wireframe-video" {...commonProps}>
            <PlaySquareOutlined
              style={{ fontSize: "48px", color: "#475569" }}
            />
            <div className="video-duration">00:42</div>
          </div>
        );
      default:
        return null;
    }
  };

  const deleteElement = (id: string) => {
    setElements(elements.filter((el) => el.id !== id));
  };

  const bringToFront = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setElements([...elements.filter((e) => e.id !== id), el]);
  };

  const sendToBack = (id: string) => {
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    setElements([el, ...elements.filter((e) => e.id !== id)]);
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only delete if an item is selected AND we aren't currently editing text
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !editingId
      ) {
        // Use functional state update to ensure we have the latest elements state
        setElements((prevElements) =>
          prevElements.filter((el) => el.id !== selectedId),
        );
        setSelectedId(null);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    // Cleanup listener on unmount or when dependencies change
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [selectedId, editingId]);

  return (
    <Layout className="app-layout">
      <Header className="app-header">
        <Title level={3} className="header-title">
          Wireframe Builder
        </Title>
        <Button
          type="primary"
          icon={<DownloadOutlined />}
          onClick={exportCanvasToImage}
          className="export-btn"
        >
          Export
        </Button>
      </Header>

      <Layout>
        <Sider
          width={200}
          className="app-sidebar"
          breakpoint="lg"
          collapsedWidth="0"
        >
          <Space orientation="vertical" style={{ width: "100%" }} size="small">
            <Button
              block
              icon={<LayoutOutlined />}
              onClick={() => addElement("browser")}
            >
              Browser
            </Button>
            <Button
              block
              icon={<BorderOutlined />}
              onClick={() => addElement("button")}
            >
              Button
            </Button>
            <Button
              block
              icon={<FontColorsOutlined />}
              onClick={() => addElement("text")}
            >
              Text Block
            </Button>
            <Button
              block
              icon={<BorderOutlined />}
              onClick={() => addElement("rectangle")}
            >
              Container
            </Button>
            <Button
              block
              icon={<PictureOutlined />}
              onClick={() => addElement("image")}
            >
              Image Box
            </Button>
            <Button
              block
              icon={<MinusOutlined />}
              onClick={() => addElement("line")}
            >
              Line / Divider
            </Button>
            <Button
              block
              icon={<PlaySquareOutlined />}
              onClick={() => addElement("video")}
            >
              Video Player
            </Button>
          </Space>
        </Sider>

        <Content className="app-content">
          <div className="export-wrapper" ref={canvasRef}>
            <div className="canvas-wrapper">
              <div
                className="wireframe-canvas"
                onClick={() => setSelectedId(null)}
              >
                {elements.map((el) => (
                  <Rnd
                    key={el.id}
                    bounds="parent"
                    className={`rnd-element rnd-${el.id}`}
                    size={{ width: el.width, height: el.height }}
                    position={{ x: el.x, y: el.y }}
                    onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                      e.stopPropagation();
                      setSelectedId(el.id);
                    }}
                    onDragStop={(e, d) =>
                      updateElement(el.id, { x: d.x, y: d.y })
                    }
                    onResizeStop={(e, direction, ref, delta, position) => {
                      updateElement(el.id, {
                        width: parseInt(ref.style.width, 10),
                        height: parseInt(ref.style.height, 10),
                        ...position,
                      });
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      {selectedId === el.id && (
                        <div className="layer-controls">
                          <button
                            className="layer-btn"
                            onClick={() => bringToFront(el.id)}
                            title="Bring Forward"
                          >
                            ⬆
                          </button>
                          <button
                            className="layer-btn"
                            onClick={() => sendToBack(el.id)}
                            title="Send Backward"
                          >
                            ⬇
                          </button>
                          <button
                            className="layer-btn delete"
                            onClick={() => deleteElement(el.id)}
                            title="Delete"
                          >
                            ✖
                          </button>
                        </div>
                      )}
                      {renderElementContent(el)}
                    </div>
                  </Rnd>
                ))}
              </div>
            </div>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default App;
