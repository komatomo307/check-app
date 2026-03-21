import { useMemo, useState } from "react";
import Papa from "papaparse";

const PAGE_SIZE = 1;
const FIELD_INDUSTRY = "業界";
const FIELD_CASE = "事例名";
const FIELD_DESCRIPTION = "その説明";
const FIELD_GLOSSARY = "専門用語の解説";

function downloadTextFile(text, fileName) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function nowStamp() {
  const date = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}_${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

export default function App() {
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [sourceName, setSourceName] = useState("export");
  const [likedRows, setLikedRows] = useState({});
  const [comments, setComments] = useState({});
  const [commentInput, setCommentInput] = useState({});
  const [checkedRows, setCheckedRows] = useState({});
  const [checkedAt, setCheckedAt] = useState({});
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  }, [rows.length]);

  const pagedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [page, rows]);

  const allChecked = useMemo(() => {
    if (rows.length === 0) {
      return false;
    }
    return rows.every((_, idx) => checkedRows[idx]);
  }, [rows, checkedRows]);

  const likedRowIndexes = useMemo(() => {
    return Object.keys(likedRows)
      .filter((rowIndex) => likedRows[rowIndex])
      .map((rowIndex) => Number(rowIndex))
      .sort((a, b) => a - b);
  }, [likedRows]);

  const getFieldValue = (row, preferredHeader, fallbackIndex) => {
    if (row[preferredHeader] !== undefined) {
      return row[preferredHeader] ?? "";
    }
    const fallbackHeader = headers[fallbackIndex];
    return fallbackHeader ? row[fallbackHeader] ?? "" : "";
  };

  const onUpload = (file) => {
    setError("");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      encoding: "utf-8",
      complete: (result) => {
        if (result.errors.length > 0) {
          setError(`CSV解析エラー: ${result.errors[0].message}`);
          return;
        }
        setHeaders(result.meta.fields || []);
        setRows(result.data || []);
        setSourceName(file.name.replace(/\.csv$/i, "") || "export");
        setLikedRows({});
        setComments({});
        setCommentInput({});
        setCheckedRows({});
        setCheckedAt({});
        setPage(1);
      },
    });
  };

  const toggleLike = (rowIndex) => {
    setLikedRows((prev) => {
      const next = { ...prev };
      if (next[rowIndex]) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = true;
      }
      return next;
    });
  };

  const updateCommentInput = (rowIndex, value) => {
    setCommentInput((prev) => ({ ...prev, [rowIndex]: value }));
  };

  const addComment = (rowIndex) => {
    const value = (commentInput[rowIndex] || "").trim();
    if (!value) {
      return;
    }

    setComments((prev) => {
      const next = { ...prev };
      const old = next[rowIndex] || [];
      next[rowIndex] = [...old, value];
      return next;
    });

    setCommentInput((prev) => ({ ...prev, [rowIndex]: "" }));
  };

  const removeComment = (rowIndex, commentIndex) => {
    setComments((prev) => {
      const old = prev[rowIndex] || [];
      const nextArray = old.filter((_, idx) => idx !== commentIndex);
      const next = { ...prev };
      if (nextArray.length === 0) {
        delete next[rowIndex];
      } else {
        next[rowIndex] = nextArray;
      }
      return next;
    });
  };

  const toggleRowChecked = (rowIndex) => {
    setCheckedRows((prev) => {
      const nextValue = !prev[rowIndex];
      if (nextValue) {
        setCheckedAt((old) => ({
          ...old,
          [rowIndex]: new Date().toISOString(),
        }));
      }
      return { ...prev, [rowIndex]: nextValue };
    });
  };

  const exportCsv = () => {
    if (!allChecked) {
      return;
    }

    const exportRows = likedRowIndexes.map((rowIndex) => {
      const original = rows[rowIndex];
      const rowComments = comments[rowIndex] || [];

      return {
        ...original,
        liked: true,
        comments: JSON.stringify(rowComments),
        checked_at: checkedAt[rowIndex] || "",
      };
    });

    const csv = Papa.unparse(exportRows, {
      columns: [
        ...headers,
        "liked",
        "comments",
        "checked_at",
      ],
    });

    downloadTextFile(csv, `${sourceName}_liked_rows_${nowStamp()}.csv`);
  };

  const hasData = rows.length > 0;

  return (
    <main className="app">
      <section className="hero">
        <h1>Vocabulary Card Review</h1>
        <p>
          1カードずつ確認し、気になった事例にハートとコメントを残してCSV出力します。
        </p>
      </section>

      <section className="panel">
        <label className="file-label" htmlFor="fileInput">
          CSVファイルを選択
        </label>
        <input
          id="fileInput"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              onUpload(file);
            }
          }}
        />
        {error && <p className="error">{error}</p>}
      </section>

      {hasData && (
        <section className="panel status-grid">
          <div>
            <strong>行数</strong>
            <p>{rows.length}</p>
          </div>
          <div>
            <strong>確認済み</strong>
            <p>
              {Object.values(checkedRows).filter(Boolean).length} /{" "}
              {rows.length}
            </p>
          </div>
          <div>
            <strong>いいね対象行</strong>
            <p>{likedRowIndexes.length}</p>
          </div>
          <div>
            <button type="button" disabled={!allChecked} onClick={exportCsv}>
              抽出CSVをダウンロード
            </button>
          </div>
        </section>
      )}

      {hasData && (
        <section className="list">
          {pagedRows.map((row, offset) => {
            const rowIndex = (page - 1) * PAGE_SIZE + offset;
            const liked = Boolean(likedRows[rowIndex]);
            const checked = Boolean(checkedRows[rowIndex]);
            const rowComments = comments[rowIndex] || [];
            const industry = getFieldValue(row, FIELD_INDUSTRY, 0);
            const caseName = getFieldValue(row, FIELD_CASE, 1);
            const description = getFieldValue(row, FIELD_DESCRIPTION, 2);
            const glossary = getFieldValue(row, FIELD_GLOSSARY, 3);

            return (
              <article key={rowIndex} className="card">
                <header className="card-head">
                  <h2>Card {rowIndex + 1}</h2>
                </header>

                <div className="meta">
                  <p>{industry}</p>
                  <p>{caseName}</p>
                </div>

                <p className="description">{description}</p>
                <p className="glossary">{glossary}</p>

                <div className="comment-box card-comment-box">
                  <div className="comment-input-row">
                    <input
                      type="text"
                      value={commentInput[rowIndex] || ""}
                      onChange={(e) =>
                        updateCommentInput(rowIndex, e.target.value)
                      }
                      placeholder="このカードへのコメントを追加"
                    />
                    <button type="button" onClick={() => addComment(rowIndex)}>
                      追加
                    </button>
                  </div>

                  {rowComments.length > 0 && (
                    <ul>
                      {rowComments.map((comment, idx) => (
                        <li key={idx}>
                          <span>{comment}</span>
                          <button
                            type="button"
                            onClick={() => removeComment(rowIndex, idx)}
                          >
                            削除
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="card-actions">
                    <button
                      type="button"
                      className={liked ? "toggle-btn heart-toggle active" : "toggle-btn heart-toggle"}
                      onClick={() => toggleLike(rowIndex)}
                      aria-label={liked ? "いいねを取り消す" : "カードにいいね"}
                    >
                      <span aria-hidden="true">
                        {liked
                          ? String.fromCharCode(9829)
                          : String.fromCharCode(9825)}
                      </span>
                      <span>{liked ? "いいね ON" : "いいね OFF"}</span>
                    </button>

                    <button
                      type="button"
                      className={checked ? "toggle-btn confirm-toggle active" : "toggle-btn confirm-toggle"}
                      onClick={() => toggleRowChecked(rowIndex)}
                      aria-label={checked ? "確認を取り消す" : "確認済みにする"}
                    >
                      <span>{checked ? "確認 ON" : "確認 OFF"}</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      {hasData && (
        <section className="panel pagination">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            前へ
          </button>
          <p>
            {page} / {totalPages}
          </p>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            次へ
          </button>
        </section>
      )}
    </main>
  );
}
